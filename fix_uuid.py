with open('api/controllers/EventController.php', 'r') as f:
    c = f.read()

import re

uuid_func = """    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }"""

c = re.sub(r'    private function generateUuid\(\) \{\n        return bin2hex\(random_bytes\(16\)\);\n    \}', uuid_func, c)

with open('api/controllers/EventController.php', 'w') as f:
    f.write(c)
