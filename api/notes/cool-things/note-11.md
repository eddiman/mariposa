---
slug: note-11
title: TypeScript Utility Types
category: cool-things
tags:
  - typescript
  - reference
createdAt: '2026-01-16T14:45:17.767Z'
updatedAt: '2026-01-25T20:27:14.365Z'
position:
  x: -3006.4265338119835
  'y': 476.22443399358355
---
```typescript
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

type PartialUser = Partial<User>;
type RequiredUser = Required<User>;
type ReadonlyUser = Readonly<User>;
type UserKeys = keyof User;
```
