---
slug: note-4
title: Quick Python Tip
category: Programming
tags: []
createdAt: '2026-01-16T14:20:51.796Z'
updatedAt: '2026-01-16T14:23:25.471Z'
---
Use `collections.defaultdict` to avoid key errors:
```python
from collections import defaultdict
counts = defaultdict(int)
counts['apple'] += 1  # No KeyError!
