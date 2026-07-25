import os
import re

def resolve_file(filepath, strategy):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # regex to find conflict blocks
    pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+', re.DOTALL)
    
    def replacer(match):
        head = match.group(1)
        theirs = match.group(2)
        if strategy == "ours":
            return head
        elif strategy == "theirs":
            return theirs
        elif strategy == "both":
            return head + "\n" + theirs
        return match.group(0)

    resolved = pattern.sub(replacer, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(resolved)

# Strategy: keep theirs (main) for these because main has the better/new structure
resolve_file('backend/src/seed.py', 'theirs')
resolve_file('frontend/src/app/courses/[courseId]/page.tsx', 'theirs')
resolve_file('backend/alembic/versions/55863ba0dee5_add_br_review_002_and_csat_cache.py', 'theirs')

# Strategy: keep both for protobufs, we will fix syntax later
resolve_file('proto/learning/v1/learning.proto', 'both')
resolve_file('proto/catalog/v1/catalog.proto', 'both')

# Strategy: keep both for Python files, we will fix syntax later
resolve_file('backend/src/modules/catalog/infrastructure/models.py', 'both')
resolve_file('backend/src/modules/catalog/domain/entities.py', 'both')
resolve_file('backend/src/modules/catalog/domain/repository.py', 'both')
resolve_file('backend/src/modules/catalog/infrastructure/repository.py', 'both')
resolve_file('backend/src/modules/catalog/application/catalog_usecase.py', 'both')
resolve_file('backend/src/modules/catalog/presentation/catalog_handler.py', 'both')

# For JSON, keeping both will break JSON syntax, so let's keep theirs and we'll manually add the keys.
resolve_file('frontend/src/dictionaries/en.json', 'theirs')
resolve_file('frontend/src/dictionaries/vi.json', 'theirs')

