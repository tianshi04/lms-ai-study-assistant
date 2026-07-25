import os
import subprocess

def get_conflicted_files():
    result = subprocess.run(['git', 'diff', '--name-only', '--diff-filter=U'], capture_output=True, text=True)
    return result.stdout.splitlines()

for file in get_conflicted_files():
    print(f"Resolving {file} by keeping both")
    with open(file, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if line.startswith('<<<<<<<'):
            continue
        elif line.startswith('======='):
            continue
        elif line.startswith('>>>>>>>'):
            continue
        else:
            new_lines.append(line)
            
    with open(file, 'w') as f:
        f.writelines(new_lines)
    
    subprocess.run(['git', 'add', file])

print("Conflicts resolved by keeping both.")
