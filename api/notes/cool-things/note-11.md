---
slug: note-11
title: TypeScript Utility Types
category: cool-things
tags:
  - typescript
  - reference
createdAt: '2026-01-16T14:45:17.767Z'
updatedAt: '2026-01-24T22:45:47.325Z'
position:
  x: -2602.2403255415147
  'y': -14.309711054516953
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
