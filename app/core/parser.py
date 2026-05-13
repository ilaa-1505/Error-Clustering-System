import re
import json
import hashlib
from dataclasses import dataclass

@dataclass
class ParsedLog:
    raw: str
    cleaned: str
    error_type: str
    module: str
    timestamp: str
    log_format: str
    hash: str

class LogParser:

    NOISE_PATTERNS = [
        r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[\.\,\d]*[Z]?',
        r'\[\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4}\]',
        r'\d{6}\s+\d{6}\s+\d+',
        r'\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}',
        r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b',
        r'line \d+',
        r'0x[0-9a-fA-F]+',
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        r'\b(blk_[-\d]+)\b',
        r'\bpid\s*=?\s*\d+\b',
        r'\[\d+\]',
        r'\brhost=\S+',
        r'\buid=\d+\s+euid=\d+\b',
        r'\btty=\S+',
        r'\blogname=\S*',
        r'\bruser=\S*',
    ]

    TIMESTAMP_PATTERNS = [
        re.compile(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})'),
        re.compile(r'\[(\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4})\]'),
        re.compile(r'(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'),
        re.compile(r'(\d{6}\s+\d{6})'),
    ]

    FORMAT_PATTERNS = [
        (re.compile(r'\[\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4}\]'), 'apache'),
        (re.compile(r'^\d{6}\s+\d{6}\s+\d+'), 'hdfs'),
        (re.compile(r'^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\w+\s+\w+[\[\(]'), 'syslog'),
        (re.compile(r'^\{.*\}$'), 'json'),
        (re.compile(r'Traceback \(most recent call last\)'), 'python_traceback'),
        (re.compile(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[\.\,]\d+\s+[A-Z]+\s+\w+\s+-'), 'java'),
        (re.compile(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}'), 'standard'),
    ]

    ERROR_TYPE_PATTERN = re.compile(
        r'\b([A-Z][a-zA-Z]+(?:Error|Exception|Warning|Fault|Panic|Failure))\b'
    )

    MODULE_PATTERN = re.compile(
        r'\b([\w]+\.py|[\w]+\.java|[\w]+\.js|[\w]+\.rb|[\w]+\.go)\b'
    )

    SYSLOG_SERVICE_PATTERN = re.compile(
        r'\d{2}:\d{2}:\d{2}\s+\w+\s+([\w]+)[\(\[]'
    )

    SEVERITY_WORDS = re.compile(
        r'\b(error|warn|warning|critical|fatal|failure|failed|exception)\b',
        re.IGNORECASE
    )

    def detect_format(self, line: str) -> str:
        for pattern, fmt in self.FORMAT_PATTERNS:
            if pattern.search(line):
                return fmt
        return 'unknown'

    def extract_timestamp(self, line: str) -> str:
        for pattern in self.TIMESTAMP_PATTERNS:
            match = pattern.search(line)
            if match:
                return match.group(1)
        return ""

    def extract_error_type(self, line: str) -> str:
        match = self.ERROR_TYPE_PATTERN.search(line)
        if match:
            return match.group(1)
        syslog_msg = re.search(r'\]:\s*([^;]+)', line)
        if syslog_msg:
            msg = syslog_msg.group(1).strip()
            if msg:
                return msg.title()[:50]
        sev = self.SEVERITY_WORDS.search(line)
        return sev.group(1).title() if sev else "Unknown"

    def extract_module(self, line: str) -> str:
        match = self.MODULE_PATTERN.search(line)
        if match:
            return match.group(1)
        syslog_match = self.SYSLOG_SERVICE_PATTERN.search(line)
        if syslog_match:
            return syslog_match.group(1)
        return ""

    def extract_message(self, line: str, fmt: str) -> str:
        if fmt == 'json':
            try:
                data = json.loads(line)
                return (data.get("message") or data.get("msg")
                        or data.get("error") or line)
            except (json.JSONDecodeError, AttributeError):
                return line

        if fmt == 'apache':
            match = re.sub(r'\[.*?\]\s*', '', line).strip()
            return match or line

        if fmt == 'hdfs':
            match = re.match(r'\d{6}\s+\d{6}\s+\d+\s+\w+\s+[\w\.\$]+:\s*(.*)', line)
            return match.group(1) if match else line

        if fmt == 'syslog':
            match = re.match(r'\w{3}\s+\d+\s+[\d:]+\s+\w+\s+[\w\(\)]+\[\d+\]:\s*(.*)', line)
            return match.group(1) if match else line

        if fmt == 'java':
            match = re.match(r'[\d\-\s:,]+\s+\w+\s+[\w\.]+\s+-\s*(.*)', line)
            return match.group(1) if match else line

        return line

    def clean(self, line: str) -> str:
        cleaned = line
        for pattern in self.NOISE_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned)
        cleaned = cleaned.lower()
        cleaned = re.sub(r'[^\w\s\.\:\-]', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def is_error_line(self, line: str, fmt: str) -> bool:
        if fmt in ('python_traceback', 'json'):
            return True
        if re.search(r'\b(ERROR|WARN|WARNING|CRITICAL|FATAL|FAILURE)\b', line):
            return True
        if fmt == 'syslog' and self.SEVERITY_WORDS.search(line):
            return True
        if fmt == 'apache' and re.search(r'\[(error|warn)\]', line, re.IGNORECASE):
            return True
        return False

    def parse_line(self, line: str) -> 'ParsedLog | None':
        line = line.strip()
        if not line:
            return None

        fmt = self.detect_format(line)

        if not self.is_error_line(line, fmt):
            return None

        message = self.extract_message(line, fmt)
        cleaned = self.clean(message)

        if len(cleaned) < 5:
            return None

        return ParsedLog(
            raw=line,
            cleaned=cleaned,
            error_type=self.extract_error_type(line),
            module=self.extract_module(line),
            timestamp=self.extract_timestamp(line),
            log_format=fmt,
            hash=hashlib.md5(cleaned.encode()).hexdigest()
        )

    def parse_many(self, raw_text: str) -> dict:
        lines = raw_text.strip().split('\n')

        parsed = []
        seen_hashes = set()
        duplicates = 0
        skipped = 0
        format_counts = {}

        for line in lines:
            result = self.parse_line(line)
            if result is None:
                skipped += 1
                continue
            if result.hash in seen_hashes:
                duplicates += 1
                continue
            seen_hashes.add(result.hash)
            parsed.append(result)
            format_counts[result.log_format] = format_counts.get(result.log_format, 0) + 1

        return {
            "logs": parsed,
            "stats": {
                "total_lines": len(lines),
                "valid": len(parsed),
                "duplicates": duplicates,
                "skipped_info": skipped,
                "formats_detected": format_counts,
            }
        }