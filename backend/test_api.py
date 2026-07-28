import urllib.request
import json

def fetch_courses(search="", subject="", level="", sort_by=""):
    data = {
        "pageSize": 10,
        "searchQuery": search,
        "subject": subject,
        "level": level,
        "sortBy": sort_by
    }
    req = urllib.request.Request(
        "http://localhost:8000/catalog.v1.CatalogService/ListCourses",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            print(f"Filters(search='{search}', subject='{subject}', level='{level}') -> {len(res.get('courses', []))} courses")
    except Exception as e:
        print(f"Error: {e}")

fetch_courses()
fetch_courses(search="Python")
fetch_courses(subject="cat-subj-ds")
