# Crispr Learning · Parent Portal

Mobile-first React SPA for parents of students enrolled at Crispr Learning.
Parents sign in with their registered mobile number (OTP), pick a child from the
top-right switcher, and get three screens:

| Route          | Screen      | What it shows |
| -------------- | ----------- | ------------- |
| `/student-360` | Student 360 | Overall performance, attendance % and month calendar, last 5 test scores, subject-wise scores, mentor note, batch details, downloadable progress report PDFs |
| `/courses`     | Courses     | Every enrolled course / test series with progress and the access end date (expiring-soon and expired states), plus a course payments summary: one-time and installment orders, upcoming / overdue installments, paper-invoice numbers |
| `/hostel`      | Hostel      | Residence, room, bed, warden contact, monthly rent, and the full rent payment history |
| `/contacts`    | Contacts    | Class teacher plus Director, Academic Head and Technical Head with tap-to-call, WhatsApp and email |

Stack and layout mirror `vegaPilot/src`: Vite 7, React 19, react-router-dom 7,
axios, plain CSS with tokens. No UI kit.

Colours follow crisprlearning.com: deep teal `#005f73` for primary actions and
headings, teal `#2e9da1`, amber `#ffb703` for pending / upcoming, pink-red
`#ff3b6b` for absent / overdue, soft green for present / paid. All tokens live
in `src/styles/base/tokens.css` (the same values as candidatePortal, so both
portals read as one product).

## Run

```bash
npm install
npm run dev        # http://localhost:5174 (also reachable on your LAN for phone testing)
npm run build      # -> dist/
npm run preview
```

## Demo mode

The portal talks to the PHP APIs in `CrisprTechApp/parent/` (see
[PARENT_PORTAL_API_CONTRACT.md](PARENT_PORTAL_API_CONTRACT.md) for every
endpoint and field). Locally, serve that repo and point the app at it:

```bash
PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8099 -t /Users/abhijithcs/personal/CrisprTechApp
```

`.env.development` already sets `VITE_API_BASE=http://127.0.0.1:8099`. OTP
delivery is switched off in `parent/authenticate.php` for now, so any
10-digit number logs in with OTP `0000`.

Set `VITE_DEMO_MODE=1` to run with no backend: any valid 10-digit mobile logs
in with OTP `1234`, and every screen renders from
`src/data/parentPortalDemo.js` (two children: a hosteller and a day scholar). Nothing else changes; `src/lib/parentApi.js` is the only file that
knows about the difference.

## Layout

```
src/
  main.jsx, App.jsx            entry + routes (Protected wraps StudentProvider + Layout)
  lib/api.js                   axios client, base URL resolution, 401 handling
  lib/auth.js                  token + cached parent + selected child (localStorage)
  lib/parentApi.js             every endpoint the portal calls (demo/live switch)
  lib/format.js                INR, dates, initials
  data/parentPortalDemo.js     demo payloads (same shapes as the API contract)
  components/StudentProvider   parent + children + selected child context, useChildData()
  components/StudentSwitcher   photo + name + course dropdown in the page heading
  components/Layout            sidebar (desktop) / page heading + account menu + bottom tab bar (mobile)
  components/Toast             bottom-centre toaster (useToast)
  components/LoginHero         login illustration + caption
  components/CountryCodeSelect dial-code picker on the login form
  components/ui.jsx            Card, Pill, Trend, KpiCard, PageState
  pages/                       LoginPage, Student360Page, CoursesPage, HostelPage, ContactsPage
  styles/app.css               index only; imports base/, components/, pages/, responsive.css
                               (same split as candidatePortal, `pp-` class prefix)
```
