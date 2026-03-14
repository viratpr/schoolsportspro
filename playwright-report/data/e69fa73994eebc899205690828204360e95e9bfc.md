# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6]:
    - heading "Sign in" [level=3] [ref=e8]
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: Email
        - textbox "Email" [ref=e12]
      - generic [ref=e13]:
        - text: Password
        - textbox "Password" [ref=e14]
      - button "Sign in" [ref=e15] [cursor=pointer]
      - paragraph [ref=e16]:
        - text: "API (pnpm dev:api) and seed (pnpm db:seed) required. Demo:"
        - strong [ref=e17]: admin@platform.local
        - text: /
        - strong [ref=e18]: Admin@1234
        - text: — password is case-sensitive.
  - alert [ref=e19]
```