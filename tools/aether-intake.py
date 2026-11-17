#!/usr/bin/env python3
"""AETHER FRONTIER | No.00 read-only ZIP intake. Python stdlib only.

Never extracts or executes files; all checks operate on ZIP metadata and streamed
CRC verification. Exit 0 = package is structurally safe, 2 = reject/quarantine.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import sys
import zipfile
from pathlib import PurePosixPath

MAX_ENTRIES = 3500
MAX_EXPANDED = 256 * 1024 * 1024
MAX_SINGLE = 128 * 1024 * 1024
MAX_RATIO = 2000
SOURCE_SUFFIXES = ('.js', '.mjs', '.cjs', '.ts', '.glsl', '.vert', '.frag', '.glb', '.gltf')


def assess(path: str) -> dict:
    report = {'file': os.path.basename(path), 'status': 'PASS', 'sha256': None,
              'errors': [], 'warnings': [], 'files': 0, 'total_bytes': 0,
              'html_files': [], 'source_files': [], 'readmes': [], 'crc': 'not_checked'}
    try:
        digest = hashlib.sha256()
        with open(path, 'rb') as handle:
            while chunk := handle.read(1024 * 1024):
                digest.update(chunk)
        report['sha256'] = digest.hexdigest()
        with zipfile.ZipFile(path) as z:
            infos = z.infolist()
            report['files'] = len(infos)
            report['total_bytes'] = sum(f.file_size for f in infos)
            if len(infos) > MAX_ENTRIES:
                report['errors'].append(f'Too many ZIP entries: {len(infos)}')
            if report['total_bytes'] > MAX_EXPANDED:
                report['errors'].append('Uncompressed total exceeds 256 MiB')
            seen = set()
            for info in infos:
                raw = info.filename
                name = raw.replace('\\', '/')
                parts = PurePosixPath(name).parts
                if (not parts or not raw or raw.startswith(('/', '\\')) or
                    '..' in parts or ':' in parts[0]):
                    report['errors'].append(f'Unsafe archive path: {raw[:150]}')
                    continue
                if name in seen:
                    report['errors'].append(f'Duplicate archive path: {name[:150]}')
                seen.add(name)
                mode = (info.external_attr >> 16) & 0xFFFF
                if stat.S_ISLNK(mode):
                    report['errors'].append(f'Symlink not allowed: {name[:150]}')
                if info.flag_bits & 0x1:
                    report['errors'].append(f'Encrypted entry: {name[:150]}')
                if info.file_size > MAX_SINGLE:
                    report['errors'].append(f'Entry exceeds 128 MiB: {name[:150]}')
                if info.compress_size and info.file_size / info.compress_size > MAX_RATIO and info.file_size > 1024 * 1024:
                    report['errors'].append(f'Extreme compression ratio: {name[:150]}')
                lower = name.lower()
                if lower.endswith(('.html', '.htm')):
                    report['html_files'].append(name)
                if lower.endswith(SOURCE_SUFFIXES):
                    report['source_files'].append(name)
                if PurePosixPath(lower).name.startswith('readme'):
                    report['readmes'].append(name)
            if not report['html_files']:
                report['warnings'].append('No standalone HTML found')
            if not report['source_files']:
                report['warnings'].append('No source JS/3D file found')
            if not report['readmes']:
                report['warnings'].append('No README found')
            # Avoid decompression of suspicious archives, including ZIP bombs.
            if not report['errors']:
                try:
                    corrupt = z.testzip()
                    report['crc'] = 'passed' if corrupt is None else 'failed'
                    if corrupt:
                        report['errors'].append(f'CRC or decompression failure: {corrupt[:150]}')
                except (OSError, RuntimeError, zipfile.BadZipFile, EOFError, ValueError) as e:
                    report['crc'] = 'failed'
                    report['errors'].append(f'ZIP integrity error: {type(e).__name__}')
    except (OSError, zipfile.BadZipFile, zipfile.LargeZipFile) as e:
        report['errors'].append(f'Cannot open ZIP: {type(e).__name__}')
    if report['errors']:
        report['status'] = 'REJECT'
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description='Read-only AETHER FRONTIER source ZIP validation')
    parser.add_argument('zip_files', nargs='+', help='ZIP packages to inspect')
    parser.add_argument('--json', action='store_true', help='Machine-readable JSON output')
    args = parser.parse_args(argv)
    reports = [assess(path) for path in args.zip_files]
    if args.json:
        print(json.dumps(reports, ensure_ascii=False, indent=2))
    else:
        for r in reports:
            print(f"{r['status']}: {r['file']} | files={r['files']}, sources={len(r['source_files'])}, HTML={len(r['html_files'])}, CRC={r['crc']}")
            for msg in r['errors']:
                print(f'  ERROR: {msg}')
            for msg in r['warnings']:
                print(f'  WARN: {msg}')
    return 2 if any(r['errors'] for r in reports) else 0


if __name__ == '__main__':
    sys.exit(main())
