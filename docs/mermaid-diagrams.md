# Mermaid diagrams

Reference and examples for Mermaid diagrams. Use these in blog posts (wrap in ` ```mermaid ` code blocks) or copy into any Markdown that supports Mermaid.

---

## 1. Flowchart (left to right)

```mermaid
flowchart LR
  A[Create competition] --> B[Add sports & categories]
  B --> C[Generate bracket]
  C --> D[Enter scores]
  D --> E[Finalize result]
  E --> F[Winner advances]
```

---

## 2. Flowchart (top to bottom)

```mermaid
flowchart TD
  A[Create competition] --> B[Add sports & categories]
  B --> C[Generate bracket]
  C --> D[Enter scores]
  D --> E[Finalize result]
  E --> F[Winner advances]
```

---

## 3. Sequence diagram

```mermaid
sequenceDiagram
  participant U as User
  participant P as Platform
  U->>P: Create competition
  P->>U: Competition created
  U->>P: Add teams & generate bracket
  P->>U: Bracket ready
  U->>P: Enter score & finalize
  P->>U: Winner advanced
```

---

## 4. Bracket / process with subgraphs

```mermaid
flowchart TB
  subgraph Setup
    S1[Create competition]
    S2[Add sports]
    S3[Add categories & teams]
  end
  S1 --> S2 --> S3
  S3 --> B[Generate bracket]
  B --> M[Play matches]
  M --> W[Winner advances]
```

---

## 5. Pie chart

```mermaid
pie title Event types
  "Knockout" : 45
  "League" : 30
  "Individual" : 25
```

---

## 6. Entity relationship (data model sketch)

```mermaid
erDiagram
  Tenant ||--o{ Competition : has
  Competition ||--o{ CompetitionSport : has
  CompetitionSport ||--o{ Category : has
  Category ||--o{ Team : has
  Category ||--o{ Match : has
  Match }o--|| Team : "team A"
  Match }o--|| Team : "team B"
  Tenant {
    string id
    string name
    string slug
  }
  Competition {
    string id
    string name
    string tenantId
  }
```

---

## 7. State diagram (match lifecycle)

```mermaid
stateDiagram-v2
  [*] --> Scheduled
  Scheduled --> InProgress : Start
  InProgress --> Draft : Save scorecard
  Draft --> InProgress : Edit
  InProgress --> Finalized : Finalize
  Finalized --> [*]
```

---

## 8. User journey (flowchart)

```mermaid
flowchart LR
  subgraph Signup
    A[Landing] --> B[Sign up]
    B --> C[Trial tenant]
  end
  subgraph App
    C --> D[Dashboard]
    D --> E[Competitions]
    E --> F[Matches & scorecards]
  end
  F --> G[Billing / Pro]
```

---

## Syntax quick reference

| Diagram type   | First line              | Example use           |
|----------------|-------------------------|------------------------|
| Flowchart      | `flowchart LR` or `TD`  | Processes, steps       |
| Sequence       | `sequenceDiagram`       | User ↔ system flows    |
| Entity-relation| `erDiagram`             | Tables, relationships  |
| State          | `stateDiagram-v2`       | Status / lifecycle     |
| Pie            | `pie title Title`       | Proportions            |
| Gantt          | `gantt`                 | Timelines              |

- **LR** = left–right, **TD** = top–down  
- Nodes: `A[text]` rectangle, `B(text)` rounded, `C{text}` diamond  
- Arrows: `-->` solid, `-.->` dotted, `==>` thick  

[Full syntax: https://mermaid.js.org](https://mermaid.js.org)
