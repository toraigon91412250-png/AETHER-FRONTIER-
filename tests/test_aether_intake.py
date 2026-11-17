import importlib.util
import io
import os
import tempfile
import unittest
import zipfile

script = os.path.join(os.path.dirname(__file__), '..', 'tools', 'aether-intake.py')
spec = importlib.util.spec_from_file_location('aether_intake', script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class IntakeTests(unittest.TestCase):
    def package(self, files):
        tmp = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        tmp.close()
        with zipfile.ZipFile(tmp.name, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            for name, content in files.items():
                z.writestr(name, content)
        self.addCleanup(lambda: os.remove(tmp.name))
        return tmp.name

    def test_safe_package(self):
        p = self.package({'README.md': 'usage', 'index.html': '<html/>', 'src/module.js': 'export const x=1;'})
        r = module.assess(p)
        self.assertEqual(r['status'], 'PASS')
        self.assertEqual(r['crc'], 'passed')
        self.assertEqual(len(r['source_files']), 1)

    def test_reject_path_traversal(self):
        p = self.package({'../outside.js': 'bad', 'README.md': 'info'})
        self.assertEqual(module.assess(p)['status'], 'REJECT')

    def test_reject_absolute_path(self):
        p = self.package({'/tmp/overwrite.html': 'bad'})
        self.assertEqual(module.assess(p)['status'], 'REJECT')

    def test_reject_missing_file(self):
        self.assertEqual(module.assess('/file-that-does-not-exist.zip')['status'], 'REJECT')

    def test_warns_on_missing_readme_html(self):
        p = self.package({'source/index.js': 'export const x=1;'})
        r = module.assess(p)
        self.assertEqual(r['status'], 'PASS')
        self.assertEqual(len(r['warnings']), 2)


if __name__ == '__main__':
    unittest.main()
