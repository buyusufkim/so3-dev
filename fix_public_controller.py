import re

with open('api/controllers/PublicEventController.php', 'r') as f:
    content = f.read()

# Fix categories
content = content.replace("Response::json(['data' => $categories]);", "Response::json(['items' => $categories]);")

# Fix index
content = content.replace("""            Response::json([
                'data' => $events,
                'meta' => [""", """            Response::json([
                'items' => $events,
                'meta' => [""")

# Fix show
content = content.replace("Response::json(['data' => $response]);", "Response::json($response);")

with open('api/controllers/PublicEventController.php', 'w') as f:
    f.write(content)
