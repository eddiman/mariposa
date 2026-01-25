---
slug: note-77
title: TypeScript Utility Types (copy)
category: dev
tags:
  - typescript
  - reference
createdAt: '2026-01-24T13:14:20.187Z'
updatedAt: '2026-01-25T19:48:28.311Z'
position:
  x: -1289.3002985714857
  'y': -474.90488156969286
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
en readers
