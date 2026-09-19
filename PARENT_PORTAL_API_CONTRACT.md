# Parent Portal — API Requirements

**Status:** Implemented · **Owner:** herosPortal (parent portal SPA) · **Backend:** `CrisprTechApp/parent/*.php`

This document lists every API the parent portal uses, screen by screen, with
request/response shapes, the tables each field comes from, and the rules the
UI relies on. The endpoints are plain PHP scripts in `CrisprTechApp/parent/`
(same style as `/user` and `/restricted`), sharing `parent-api-bootstrap.php`.
The SPA's single call site for every endpoint is `src/lib/parentApi.js`; the
demo data in `src/data/parentPortalDemo.js` mirrors these shapes.

---

## 1. Screens and endpoints

| Screen | Route in SPA | Endpoints used |
| --- | --- | --- |
| Login (mobile + OTP) | `/login` | `POST /parent/authenticate.php`, `POST /parent/login.php` |
| Shell (student switcher, headings, logout, profile) | all | `GET /parent/me.php`, `POST /parent/update-profile.php`, `POST /parent/logout.php` |
| Student 360 | `/student-360` | `GET /parent/student-360.php?candidateId=`, `GET /parent/progress-reports.php?candidateId=`, `GET /parent/quiz-stats.php?candidateId=&quizId=`, `GET /parent/course-progress.php?candidateId=` |
| Courses + course payments | `/courses` | `GET /parent/courses.php?candidateId=`, `GET /parent/course-payments.php?candidateId=` |
| Hostel + rent payments | `/hostel` | `GET /parent/hostel.php?candidateId=` |
| Hostel leave requests | `/hostel` | `GET /parent/hostel-leaves.php?candidateId=`, `POST /parent/hostel-leave-request.php` |
| Contacts | `/contacts` | `GET /parent/contacts.php?candidateId=` |

Fourteen endpoints in total: three auth, eleven portal. Shared files:

| File | Purpose |
| --- | --- |
| `parent-api-bootstrap.php` | CORS, DB, token validation, `requireMappedCandidate()`, response + query helpers |
| `parent-secure-token-validations.php` | Bearer token decrypt / expiry check (sends 401) |
| `parent-student-proxy.php` | Runs an existing `/user/*.php` (student) API as the child: mints a student token for the mapped candidate, calls the script over HTTP and re-wraps the answer. Used by `quiz-stats.php` |
| `parent-hostel-leave-shape.php` | Leave enums, row shape and the provider / warden SMS for the two leave endpoints |
| `parent-contacts-config.php` | Institute contacts shown on the Contacts screen |
| `parent-schema.sql`, `parent-payments-schema.sql` | Auth tables, `candidate_progress_cards`, `hostel_allotted`, `hostel_leave_requests`; `payments_course_fee` and `payments_hostel_fee` ledgers |

**Wrappers vs native scripts.** Where the candidate app already has the
endpoint under `/user`, the parent script is a thin wrapper
(`quiz-stats.php` → `user/quiz/quiz-stats.php`): the parent token and the
child mapping are checked here, then the student script runs unchanged with
a token minted for the child. Everything else is native because no student
endpoint returns the parent-side shape (`student-360.php` merges the data of
`user/dashboard-summary.php`, `user/quiz/quiz-summary.php` and the exam
attempts; `course-progress.php` builds the whole subject → chapter → part
tree that `user/courses/get-course-progress*.php` only serve one chapter of).

The wrapper calls the app's own origin (`PARENT_STUDENT_API_BASE` env var or
PHP constant overrides it). With PHP's built-in server that is a request to
itself, so run it with workers or the wrapper waits on its own process:

```
PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8099 -t CrisprTechApp
```

---

## 2. Conventions

**Base path.** `/parent/` on the host that serves `CrisprTechApp`
(`https://crisprtech.app` in production; locally
`PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:8099 -t CrisprTechApp`). No `/api` prefix.

**Envelope.** Same as `/parent/login.php` and the `/user` scripts:

```json
{ "status": "success", "data": … }
{ "status": "failed",  "error": "Human-readable message" }
```

**Child selection.** Per-child endpoints take `?candidateId=<registered_candidates.id>`
(also accepted in a JSON POST body).

**Auth.** Portal routes require `Authorization: Bearer <token>`. Any `401`
from any portal route makes the SPA drop the session and return to `/login`,
so only send `401` for a missing, expired or revoked token. Use `403` for a
valid parent asking for a child that is not theirs.

**HTTP status usage.**

| Status | When |
| --- | --- |
| 200 | Success, including "empty" results (empty array or `null` payload) |
| 400 | Validation failure (bad mobile, missing OTP key) |
| 401 | No / invalid / expired token, or wrong OTP on `/login` |
| 403 | Child `{id}` is not mapped to the authenticated parent |
| 429 | Throttled (OTP abuse) |

**Types.** Dates are ISO `YYYY-MM-DD` strings (not UNIX seconds; the UI
formats them). Money is an integer number of rupees (no paise, no formatting).
Percentages are integers 0–100. Mobile numbers are 10-digit strings with no
spaces or country code; `countryCode` is carried separately.

**Nulls.** Optional fields must be present with `null`, not omitted, so the
frontend can rely on the shape.

**Ordering.** Lists are returned pre-sorted as stated per endpoint; the UI
does not re-sort except where noted.

**CORS.** Same allowlist treatment as the admin SPA origin; add the parent
portal's origin when it gets a domain.

---

## 3. Identity and access rules

Source tables already in the database:

- `parent_profiles` — `id`, `name`, `mobile` (10-digit, stored as int), …
- `candidate_parent_mapping` — `parentId`, `candidateId`, `status` (1 = active), `createdAt`
- `registered_candidates` — `id`, `name`, `photo`, `registeredMobile`, `communicationMobile`, `status`

Rules:

1. A parent is identified by `parent_profiles.mobile`. One mobile = one parent.
2. A parent's children are every `registered_candidates` row reachable through an
   **active** `candidate_parent_mapping` row. Inactive mappings are invisible.
3. Every per-child `/parent/*.php?candidateId=` script must verify the mapping and
   return `403` otherwise. Never leak whether the candidate id exists.
4. Blocked / inactive candidates (`registered_candidates.status`) should still be
   listed (the parent needs to see the status), but the backend decides what
   the per-child endpoints return for them. Open question 1.

---

## 4. Auth

The existing `/parent/authenticate.php` and `/parent/login.php` (mirrors of
`/user/authenticate.php` and `/user/login.php`, backed by `parent_profiles`
and `parent_login_attempts`). Country codes are sent without the `+`.

### 4.1 `POST /parent/authenticate.php` — send OTP

Request
```json
{ "username": "9847012345", "countryCode": "91" }
```
Response
```json
{ "status": "success", "data": "<opaque login secret>", "message": "OTP sent …" }
```

- `data` is echoed back as `key` on `/login.php`. The SPA uses a fixed
  120-second resend countdown.
- **OTP delivery is currently switched off**: `$OTP_DELIVERY_DISABLED = true`
  at the top of `authenticate.php` fixes every OTP to `0000` and sends no
  SMS / WhatsApp. Set it to `false` to go live. The WhatsApp helper
  (`whatsappblackbox.php`) is loaded only when present, so dev machines
  without it still work for +91 numbers.
- Too many attempts → `status:"failed"` with `data` = seconds to wait.
- An unknown number goes through the new-parent registration flow
  (`type: "PR"` secret); after OTP verification `login.php` creates the
  `parent_profiles` row. Such a parent sees the "no student linked" notice
  until the office adds a `candidate_parent_mapping` row.

### 4.2 `POST /parent/login.php` — verify OTP, issue token

Request
```json
{ "username": "9847012345", "countryCode": "91", "passcode": "1234", "key": "<secret>" }
```
Response
```json
{
  "status": "success",
  "data": "<encrypted token>",
  "isNewParent": false,
  "mappedStudents": [ { "candidateId": 101, "candidateKey": "…", "name": "…", "classOfStudy": 3, "photo": "", "mappedOn": 1780000000 } ]
}
```

- Wrong OTP → HTTP 200 with `status:"failed"`; the SPA shows the error inline.
- The token is an AES-encrypted payload with `role: "parent"`, `pid`, `pkey`,
  so it is rejected by the student and admin validators and vice versa.
  Expiry is `$tokenExpiryDays` from `user-secure.php`.
- The SPA ignores `mappedStudents` and calls `me.php` for the full `Child`
  shape right after login.

### 4.3 `POST /parent/logout.php` (auth)

Tokens are self-contained and there is no server-side token store, so this
validates the token and acknowledges (`data.loggedOut: true`); the SPA clears
its local state. Revocation can be added later by hashing `$TOKEN_RAW` here
and checking it in the validator.

---

## 5. Shell

### 5.1 `GET /parent/me.php` (auth)

Called on every app load to refresh the parent and child list.

```json
{
  "parent": { "id": 501, "name": "Sreelatha Menon", "countryCode": "+91", "mobile": "9847012345" },
  "children": [
    {
      "id": 101,
      "candidateKey": "CL-2026-10897",
      "name": "Aarav Menon",
      "photo": "https://…/profile.jpg",
      "gender": "Male",
      "classOfStudy": "12th pass",
      "primaryCourse": { "name": "NEET Repeater 2027", "batch": "Alpha · Offline" },
      "center": "Kochi · MG Road",
      "hosteller": true,
      "status": "active"
    }
  ]
}
```
`parent` carries `email`, `place`, `gender` (`Male` / `Female` / `Trans Gender`),
`relation`, `photo` (all nullable) and `profileComplete`, which is true once
name, email, place and gender are all set. While it is false the portal opens
the profile dialog right after login (the parent can choose "Later" for the
session; the sidebar / top bar keep an amber dot until it is done).

### 5.2 `POST /parent/update-profile.php` (auth)

Updates the parent's basic details (`parent_profiles.name / email / place /
gender`; `place` and `gender` are added by section 4 of `parent-schema.sql`).

```json
// request
{ "name": "Sreelatha Menon", "email": "sreelatha@example.com", "place": "Kochi", "gender": "Female" }
// response: the same parent object as me.php
```
- `gender` accepts the name or the code (1 Male, 2 Female, 3 Trans Gender, 0 unset).
- Validation errors return HTTP 400 with `status: "failed"`: name 2–80
  chars, valid email (may be empty), place ≤ 60 chars.

`Child` fields

| Field | Type | Req | Source / derivation | Used for |
| --- | --- | --- | --- | --- |
| `id` | int | yes | `registered_candidates.id` | all per-child calls |
| `candidateKey` | string | yes | candidate display key | Batch card, switcher |
| `name` | string | yes | `registered_candidates.name` | switcher, headings (first name), empty states |
| `photo` | string\|null | yes | `registered_candidates.photo` (absolute URL) | switcher avatar; initials fallback when null |
| `gender` | string\|null | yes | `registered_candidates.gender` via `getGenderNameByCode` | not shown yet |
| `classOfStudy` | string\|null | yes | `registered_candidates.classOfStudy` via `getClassNameByCode` | not shown yet |
| `primaryCourse.name` | string\|null | yes | title of the active course enrolment (`catalogType = 1`) with the latest expiry (`candidate_enrollments` → `catalog.title`) | switcher subtitle |
| `primaryCourse.batch` | string\|null | yes | `candidate_batches.name · mode` via active `candidate_batch_mapping` | switcher menu |
| `center` | string\|null | yes | `locations.name` of the batch | not shown yet |
| `hosteller` | bool | yes | active `candidate_residence_mapping` exists | future badge; hostel page fetches anyway |
| `status` | `active` \| `inactive` | yes | `registered_candidates.blocked` / `status` | future badge |

Headings are built client-side as `"<first name>'s Performance / Courses /
Hostel Details / Contacts"`, so `name` must be the full name with the first
name first.

---

## 6. Student 360

### 6.1 `GET /parent/student-360.php?candidateId=` (auth)

One call returns everything on the page: the consolidated performance view
(candidate portal's Performance + Attendance pages merged for the parent).

```json
{
  "overall": {
    "performance": 82,
    "performanceDelta": 4,
    "rank": 6,
    "batchStrength": 48,
    "label": "High",
    "summary": "Performance is up 4% compared to last month. Physics is the strongest subject; Botany needs attention."
  },
  "attendance": {
    "percent": 92,
    "percentDelta": 3,
    "months": [
      {
        "key": "2026-09",
        "label": "September 2026",
        "present": 4, "absent": 1, "total": 5, "percent": 80,
        "days": [
          { "date": "2026-09-01", "day": 1, "weekday": 2, "status": "present" },
          { "date": "2026-09-06", "day": 6, "weekday": 0, "status": "off" },
          { "date": "2026-09-07", "day": 7, "weekday": 1, "status": "upcoming" }
        ]
      }
    ]
  },
  "lastTests": [
    { "id": 9007, "name": "Grand Mock 07", "subject": "Full syllabus", "date": "2026-09-02",
      "score": 612, "max": 720, "rank": 5, "batchStrength": 48, "percentile": 88 }
  ],
  "subjects": [
    { "name": "Physics", "percent": 91, "delta": 6 }
  ],
  "examTrend": [
    { "id": 9006, "name": "Grand Mock 06", "date": "2026-08-26", "score": 574, "max": 720, "classAverage": 505 },
    { "id": 9007, "name": "Grand Mock 07", "date": "2026-09-02", "score": 612, "max": 720, "classAverage": 511 }
  ],
  "summary": {
    "aspiration": "NEET 2027",
    "strikeRate": 71.4, "strikeRateFrom": 12,
    "averageScore": 548, "averageScoreBase": 720, "averageScoreFrom": 12,
    "pyqSolved": 1240, "pyqSolvedFrom": 3600,
    "strongSubject": "Physics", "strongSubjectPercentage": 34
  },
  "quizzes": [
    { "attemptId": 50112, "quizId": 2012, "title": "Weekly Quiz 12 · Thermodynamics",
      "dateOfExam": "2026-09-13", "score": 92, "max": 120, "accuracy": 81 }
  ],
  "mentor": { "name": "Dr. Kavya Nair", "role": "Senior Mentor · Physics", "photo": "https://…", "phone": "+91 98470 55512" },
  "batch":  { "name": "NEET Repeater 2027 — Alpha", "mode": "Offline", "center": "Kochi · MG Road", "startedOn": "2026-06-15" }
}
```

**`overall`**

| Field | Type | Source / derivation |
| --- | --- | --- |
| `performance` | int 0–100 | Mean of the last 5 completed exam attempts (`exam_attempts.status = 2`, `reportStatus = 1`), each as `finalScore / generatedReport.scoreBase`, clamped 0–100 |
| `performanceDelta` | int, signed | vs the mean of the 5 attempts before those (0 when fewer than 6) |
| `rank` | int\|null | Rank in the most recent exam among all completed attempts of that `examId` |
| `batchStrength` | int\|null | Completed attempts of that exam (fallback: `candidate_batches.strength`) |
| `label` | `"High"` \| `"Good"` \| `"Needs attention"` | ≥75 High, 50–74 Good, else Needs attention |
| `summary` | string | Generated from the delta and the strongest / weakest section (no mentor-notes table exists) |
| `testsCounted` | int | attempts behind `performance` (0 → "no tests yet" copy) |

The `overall` block is no longer rendered on Student 360 (removed 2026-09-18);
it may be dropped from the response or kept for a future use.

**`attendance`**

| Field | Type | Source / derivation |
| --- | --- | --- |
| `percent` | int | Present ÷ (present + absent) over the last 30 days, from `attendance_summary` (`user_type = 1`, `status = 1`) |
| `percentDelta` | int, signed | vs the previous 30-day window |
| `tracked` | bool | false when the student has no `attendance_mapping` and no summary rows; `months` is then `[]` and the UI shows "not tracked" |
| `months` | array | Current month first, then every earlier month back to June 2026 (academic year start), oldest last. Months before the student's attendance started are still included with every day `off` |
| `months[].key` | `YYYY-MM` | |
| `months[].label` | string | e.g. `"September 2026"` |
| `months[].present / absent / total / percent` | int | Counts over counted days only (present + absent) |
| `months[].days[]` | array | One entry per calendar day of the month, in order |
| `days[].date` | `YYYY-MM-DD` | |
| `days[].day` | int | Day of month |
| `days[].weekday` | int 0–6 | **JavaScript convention: 0 = Sunday** |
| `days[].status` | enum | `present` \| `absent` \| `holiday` \| `off` \| `upcoming` |

Status rules: `upcoming` after today; `off` on Sundays and on days before the
student's attendance started (earliest of `attendance_mapping.access_provided_at`,
first summary row, batch `dateStart`); `present` when a valid summary row
exists for the day; otherwise `absent`. `holiday` is reserved for a future
holiday table.

The UI draws a Mon–Sun calendar grid from `days[]`, so the array must be
complete and ordered.

**`lastTests`** — no longer rendered on Student 360 (replaced by the Course
Progress card, 6.4, on 2026-09-18); may be dropped. Newest first, maximum 5, from `exam_attempts` joined to
`exam_config` (`status = 2`, `reportStatus = 1`). Quiz attempts are not
included in v1.

| Field | Type | Source |
| --- | --- | --- |
| `id` | int | attempt id |
| `name` | string | exam / quiz title (`exam_config`, `quiz_config`) |
| `subject` | string | subject, or `"Full syllabus"` for mocks |
| `date` | `YYYY-MM-DD` | `actualEndTime` |
| `score` | int | `finalScore` |
| `max` | int\|null | `generatedReport.scoreBase` (null when the report lacks it) |
| `rank` | int\|null | 1 + attempts of the same exam with a higher `finalScore` |
| `batchStrength` | int\|null | completed attempts of that exam |
| `percentile` | int\|null | attempts with a lower score ÷ total × 100 |

The UI colours the bar by `score / max`: ≥75% green, 50–74% amber, else red.

**`subjects`** — one row per report section across the last 5 attempts,
ordered by `percent` descending. `percent` = correct ÷ total questions of that
section; `delta` is vs the 5 attempts before.

**`examTrend`** — the last 10 completed exam attempts, **oldest first**, for
the "Exam Progress" line chart (student marks in green, class average in
amber). Same source as `lastTests`; mocks and unit tests are mixed, so the UI
plots each point as `score ÷ max × 100` and shows raw marks in the tooltip.

| Field | Type | Source |
| --- | --- | --- |
| `id`, `name`, `date` | int, string, `YYYY-MM-DD` | as in `lastTests` |
| `score`, `max` | number, number | `finalScore`, `generatedReport.scoreBase` (rows without `max` are skipped by the UI) |
| `classAverage` | number\|null | mean `finalScore` of completed attempts of that exam, same scale as `score` |

**`summary`** — the candidate app's `user/dashboard-summary.php` tiles for
this child. Percentages are plain numbers (71.4 means 71.4 %), not the ×100
integers the candidate endpoint returns.

| Field | Type | Source |
| --- | --- | --- |
| `aspiration` | string\|null | candidate profile aspiration (e.g. `NEET 2027`) |
| `strikeRate`, `strikeRateFrom` | number, int | correct ÷ attempted across mock tests, and how many tests it counts; `0` from → tile shows NA |
| `averageScore`, `averageScoreBase`, `averageScoreFrom` | number, int, int | mean `finalScore`, its `scoreBase`, tests counted |
| `pyqSolved`, `pyqSolvedFrom` | int, int | previous-year questions solved / available |
| `strongSubject`, `strongSubjectPercentage` | string\|null, number | section contributing most marks, and its share of the total |

**`quizzes`** — the candidate app's `user/quiz/quiz-summary.php` rows, newest
first, completed attempts only. Feeds the "Quiz scores" table; each row's
"Class stats" button calls 6.3.

| Field | Type | Source |
| --- | --- | --- |
| `attemptId`, `quizId` | int | `quiz_attempts.id`, `quiz_config.id` |
| `title` | string | quiz title |
| `dateOfExam` | `YYYY-MM-DD` | attempt end time |
| `score`, `max` | number, number\|null | `finalScore`, `scoreBase` (the candidate endpoint's `"92 / 120"` string split) |
| `accuracy` | int 0–100 | correct ÷ attempted × 100 |

**`attendance.tracked`** drives the whole attendance block: when `false` the
UI shows the "not tracked yet" state instead of the four tiles, calendar and
monthly summary. The tiles are derived client-side from `months[]`: this
month (`months[0]`), academic year so far (sum of every month) and the current
streak of consecutive `present` days.

**`mentor`** — `candidate_mentor_mapping` (active) → `mentor_profile`:
`name`, `role` (`Mentor · specialisation`), `photo`, `phone` (`+91 …`). `null`
when no mentor is mapped; the UI shows "No mentor assigned yet".

**`batch`** — active `candidate_batch_mapping` → `candidate_batches`: `name`,
`mode` (type 1 Offline, 2 Online, 3 Hybrid), `center` (`locations.name`),
`startedOn`. `null` when not in a batch.

---

### 6.2 `GET /parent/progress-reports.php?candidateId=` (auth)

Progress report PDFs issued to the student, from `candidate_progress_cards`
(`status = 1`), newest first. Shown as a "Progress reports" card on Student
360 with a Download button per row; `url` must be a direct, publicly
fetchable PDF link (Bunny CDN today).

```json
[
  { "id": 1, "title": "Progress Report : July – September 2026",
    "url": "https://crisprlearning.b-cdn.net/user-data/progress-reports/candidate/….pdf",
    "issuedOn": "2026-09-30", "fileType": "pdf" }
]
```
| Field | Type | Source |
| --- | --- | --- |
| `id` | int | `candidate_progress_cards.id` |
| `title` | string | `title` (falls back to "Progress report") |
| `url` | string | `reportURL` |
| `issuedOn` | date | `createdAt` epoch |
| `fileType` | string | extension of `url`, default `pdf` |

Rows with `status = 0` are hidden. An empty array is a normal response.

### 6.3 `GET /parent/quiz-stats.php?candidateId=&quizId=&attemptId=` (auth)

Class statistics for one quiz, the same payload as the candidate app's
`user/quiz/quiz-stats.php` but scoped to the parent's child. Opened from the
"Class stats" button on the Quiz scores table.

```json
{
  "maxScore": 120, "myScore": 92, "myRank": 7, "classStrength": 46,
  "topScore": 112, "classAverage": 74,
  "subjects": [
    { "name": "Physics", "myScore": 38, "classAverage": 27, "topScore": 40, "maxScore": 40 }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `maxScore` | number | total marks of the quiz |
| `myScore` | number\|null | the child's marks (falls back to the row's `score` when null) |
| `myRank`, `classStrength` | int\|null | rank among completed attempts, and how many attempted |
| `topScore`, `classAverage` | number\|null | class average is ceiled to whole marks |
| `subjects[]` | array | per-section "child vs class" bars; may be `[]` |

Answers `404` with a human-readable `error` while the report is not generated yet
("No completed attempt found" / "Report not generated yet"), `400` without a
`quizId`. The payload also carries the student script's `quizId`, `attemptId`
and `title`. Implemented as a wrapper over `user/quiz/quiz-stats.php` (see
`parent-student-proxy.php`); a student-side `401` is reported as `502` so the
SPA does not log the parent out for a server-side problem.

### 6.4 `GET /parent/course-progress.php?candidateId=` (auth)

Video watch progress for the child's primary course, grouped subject →
chapter → module (one module = one video part), from
`candidate_course_progress` joined to the course-bundle content tree. Feeds
the "Lectures Watched" card; tapping a subject opens the chapter popup.
Returns `data: null` when the child has no video course.

```json
{
  "courseId": 3001,
  "courseName": "NEET Repeater 2027 — Complete Program",
  "subjects": [
    {
      "id": "bio", "name": "Biology",
      "chaptersTotal": 6, "modulesTotal": 70, "modulesDone": 7, "percent": 10,
      "watchHours": 3.4, "totalHours": 36.2,
      "chapters": [
        {
          "id": "bio-1", "name": "The Living World",
          "modulesTotal": 8, "modulesDone": 7, "percent": 95,
          "modules": [
            { "id": "bio-1-1", "title": "The Living World · Part 1", "durationMin": 24,
              "watchedPercent": 100, "lastWatchedOn": "2026-09-16" }
          ]
        }
      ]
    }
  ]
}
```

| Field | Type | Derivation |
| --- | --- | --- |
| `modules[].watchedPercent` | int 0–100 | `progress ÷ duration × 100` from the latest progress row for that part |
| `modules[].lastWatchedOn` | date\|null | last progress save |
| `chapters[].modulesDone` | int | modules with `watchedPercent ≥ 90` |
| `chapters[].percent` | int | mean `watchedPercent` across the chapter's modules (drives the ring: 0 grey, 1–89 amber, ≥ 90 green) |
| `subjects[].percent` | int | **`modulesDone ÷ modulesTotal × 100`** — e.g. 7 of 70 modules → 10 % (the bar on the card) |
| `subjects[].watchHours`, `totalHours` | number | Σ `durationMin × watchedPercent` ÷ 6000, Σ `durationMin` ÷ 60, one decimal |

Subjects are ordered as in the course content tree; chapters and modules keep
their content order. Empty chapters are omitted.

Implementation notes: the primary course is the active `catalogType = 1`
enrolment with the latest expiry whose catalog item points at an active
`course_bundle_config`; `courseId` is the catalog id. Ids are
`"<moduleId>"`, `"<moduleId>-<chapter>"` and `"<moduleId>-<chapter>-<part>"`
where `<chapter>` is the subject-local chapter index (the id the student app
and `candidate_course_progress` use). A part is 100 % once
`candidate_course_progress.completed = 1`, else `progress ÷ duration`.

## 7. Courses

### 7.1 `GET /parent/courses.php?candidateId=` (auth)

Every active enrolment (`candidate_enrollments.status = 1`), including ones
whose access has ended. One card per catalog item (latest expiry wins).
Sources: `candidate_enrollments` joined to `catalog`; progress from
`candidate_course_progress` and `chapter_config` (courses) or
`exam_series_config.testsIncluded` and `exam_attempts` (test series).

```json
[
  {
    "id": 3001,
    "name": "NEET Repeater 2027 — Complete Program",
    "type": "course",
    "batch": "Alpha · Offline",
    "mode": "Offline",
    "enrolledOn": "2026-06-15",
    "accessEndsOn": "2027-05-31",
    "progress": 34,
    "lessonsDone": 148,
    "lessonsTotal": 436,
    "testsDone": null,
    "testsTotal": null
  },
  {
    "id": 3002,
    "name": "NEET Grand Test Series 2027",
    "type": "test-series",
    "batch": "All batches",
    "mode": "Online",
    "enrolledOn": "2026-07-01",
    "accessEndsOn": "2027-05-10",
    "progress": 28,
    "lessonsDone": null,
    "lessonsTotal": null,
    "testsDone": 7,
    "testsTotal": 25
  }
]
```

| Field | Type | Source |
| --- | --- | --- |
| `id` | int | `candidate_enrollments.id` |
| `catalogId` | int | `catalog.id` |
| `name` | string | `catalog.title` |
| `type` | `course` \| `test-series` | `candidate_enrollments.catalogType` (1 / 2) |
| `batch` | string\|null | enrolment's batch, else the student's active batch (courses); `"All batches"` for series |
| `mode` | `Offline` \| `Online` \| `Hybrid` | batch type; `Online` when no batch. Omitted from the subtitle when `batch` already contains it |
| `enrolledOn` | date | `candidate_enrollments.createdAt` |
| `accessEndsOn` | date\|null | `candidate_enrollments.expiry` |
| `progress` | int 0–100 | `lessonsDone / lessonsTotal` or `testsDone / testsTotal` |
| `lessonsDone` / `lessonsTotal` | int\|null | courses only: completed rows in `candidate_course_progress` for the bundle; total = parts across the bundle's `chapter_config.partsConfig` |
| `testsDone` / `testsTotal` | int\|null | series only: distinct `examId` attempted (`status = 2`) / tests in `testsIncluded` |

UI-derived states from `accessEndsOn` (no backend field needed): **Expired**
when in the past, **Ends in N days** when ≤ 30 days away, **Active**
otherwise, **No end date** when null. Sort by `accessEndsOn` descending.

### 7.2 `GET /parent/course-payments.php?candidateId=` (auth)

Fee payments for every course / test-series order, read from
**`payments_course_fee`** (`parent-payments-schema.sql`): one row per payment
or installment; rows sharing an `orderNumber` form one order. Only rows with
`status = 1` are returned. Mirrors the admin Orders ↔ Payments model.

```json
[
  {
    "orderId": 6611,
    "orderNumber": "ORD-2026-0611",
    "courseId": 3001,
    "courseName": "NEET Repeater 2027 — Complete Program",
    "orderDate": "2026-06-15",
    "paymentMode": "INSTALLMENTS",
    "totalAmount": 96000,
    "payments": [
      { "id": "P-6611-1", "installmentNo": 1, "label": "Installment 1 (admission)", "amount": 24000,
        "dueOn": "2026-06-15", "paidOn": "2026-06-15", "status": "paid",
        "method": "bank_transfer", "reference": "UTR 6193XXXX21", "invoiceNo": "INV-26-0611", "late": false },
      { "id": "P-6611-3", "installmentNo": 3, "label": "Installment 3", "amount": 24000,
        "dueOn": "2026-10-15", "paidOn": null, "status": "scheduled",
        "method": null, "reference": null, "invoiceNo": null, "late": false }
    ]
  }
]
```

Order fields

| Field | Type | Notes |
| --- | --- | --- |
| `orderId` | int | id of the order's first ledger row |
| `orderNumber` | string | `payments_course_fee.orderNumber` |
| `courseId` | int\|null | `fk_id_candidate_enrollments` (matches `courses[].id`) |
| `catalogId` | int\|null | `fk_id_catalog` |
| `courseName` | string | `catalog.title`, else the row label |
| `orderDate` | date | `orderDate` epoch |
| `paymentMode` | `FULL` \| `INSTALLMENTS` | |
| `totalAmount` | int rupees | gross payable incl. GST, after discounts |
| `payments` | array | ordered by `installmentNo`; FULL orders have exactly one |

Payment fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `CF-<row id>` |
| `installmentNo` | int | 1-based |
| `label` | string | `"Full payment"`, `"Installment 2"`, … |
| `amount` | int rupees | |
| `dueOn` | date | |
| `paidOn` | date\|null | |
| `status` | `paid` \| `scheduled` \| `pending` \| `overdue` \| `failed` | the UI also promotes `scheduled`/`pending` past `dueOn` to overdue |
| `method` | `upi` \| `card` \| `netbanking` \| `bank_transfer` \| `cash` \| `cheque` \| `dd` \| `wallet` \| null | |
| `reference` | string\|null | UTR / cheque no.; mask card numbers |
| `invoiceNo` | string\|null | **display only** — invoices are issued on paper at the centre; never a download URL |
| `note` | string\|null | free text |
| `late` | bool | `paidOn > dueOn` |

The UI computes total fees, paid, outstanding, overdue amount and next due
from this payload; no summary endpoint is needed. Orders newest first.

---

## 8. Hostel

### 8.1 `GET /parent/hostel.php?candidateId=` (auth)

Returns `data: null` when the child has no active row in **`hostel_allotted`**
(`parent-schema.sql` section 6); the UI shows the day-scholar state. Hostel,
room, warden, provider, monthly fee, deposit and amenities all come from that
row (latest `id` wins); rent rows from **`payments_hostel_fee`**
(`parent-payments-schema.sql`), `status = 1`.

```json
{
  "residence": {
    "id": 1,
    "name": "Crispr Green Hostel",
    "address": "12 MG Road, Bangalore",
    "wardenName": "Mini Mol",
    "wardenPhone": "9043960876",
    "providerName": "Grace Inn Hostels",
    "providerPhones": ["9043960876", "9809677798"],
    "officePhone": "9043960876"
  },
  "room": { "number": "101", "type": "Sharing", "block": null, "floor": null, "bed": null, "mess": null },
  "checkInOn": "2026-06-28",
  "rent": {
    "monthlyAmount": 9500,
    "dueDay": 5,
    "nextDueOn": "2026-10-05",
    "deposit": 3000,
    "includes": ["4 Times Food", "Dedicated Study Space", "CCTV Monitoring"]
  },
  "payments": [
    { "id": "R-2026-09", "month": "2026-09-01", "amount": 9500, "dueOn": "2026-09-05",
      "paidOn": null, "status": "pending", "mode": null, "receiptNo": null, "late": false, "note": null },
    { "id": "R-2026-08", "month": "2026-08-01", "amount": 9500, "dueOn": "2026-08-05",
      "paidOn": "2026-08-03", "status": "paid", "mode": "UPI", "receiptNo": "RCP-08813", "late": false, "note": null },
    { "id": "D-2026-06", "month": "2026-06-01", "amount": 15000, "dueOn": "2026-06-14",
      "paidOn": "2026-06-14", "status": "paid", "mode": "Cash", "receiptNo": "RCP-07409", "late": false, "note": "Security deposit (refundable)" }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `residence.name`, `address`, `wardenName` | string\|null | `hostel_allotted.title / address / wardenName` |
| `residence.wardenPhone` | string\|null | `wardenContact`, 10 digits; UI builds `tel:+91…` |
| `residence.providerName` | string\|null | `hostelProviderName` |
| `residence.providerPhones` | string[] | `hostelProviderContact` split on commas, 10 digits each |
| `residence.officePhone` | string\|null | first provider phone |
| `room.number`, `room.type` | string\|null | `roomNumber`, `roomType` |
| `room.block`, `floor`, `bed`, `mess` | null | not modelled |
| `checkInOn` | date | `doj` (`DD-MM-YYYY` → ISO) |
| `rent.monthlyAmount` | int | `monthlyFee` |
| `rent.dueDay` | int\|null | day of the latest `RENT` ledger row's `dueOn` |
| `rent.nextDueOn` | date\|null | earliest unpaid ledger row, else next month's due day |
| `rent.deposit` | int rupees | `depositHeld` |
| `rent.includes` | string[] | `amenities` split on commas |
| `payments[]` | | newest first; `type` ∈ `RENT | DEPOSIT | OTHER`; deposits get a default note |
| `payments[].month` | date (1st of month) | `feeMonth` |
| `payments[].status` | `paid` \| `pending` \| `overdue` | UI promotes `pending` past `dueOn` to overdue |
| `payments[].mode` | string\|null | free text (`UPI`, `Cash`, `Net banking`) |
| `payments[].receiptNo` | string\|null | display only, paper receipt |

The UI computes outstanding, paid-so-far and next-due from `payments`.

### 8.2 `GET /parent/hostel-leaves.php?candidateId=` (auth)

Leave requests the parent has raised for this child, newest first, from
`hostel_leave_requests` (`parent-schema.sql` section 7, `status = 1`).
Returns `[]` for day scholars. `id` is `L-<row id>`.

```json
[
  { "id": "L-2026-0912", "outAt": "2026-09-25T16:00", "inAt": "2026-09-28T08:00", "days": 4,
    "reason": "Personal", "goingTo": "Home", "destination": null, "mode": "Student by Self",
    "remarks": "Cousin's wedding on Saturday.", "status": "pending",
    "requestedOn": "2026-09-16T10:12", "decidedOn": null, "decisionNote": null }
]
```

| Field | Type | Notes |
| --- | --- | --- |
| `outAt`, `inAt` | local datetime `YYYY-MM-DDTHH:mm` | as entered by the parent |
| `days` | int | calendar days spanned, counting both the out and in dates (same day = 1) |
| `reason` | `Medical` \| `Festival` \| `Family Function` \| `Personal` \| `Other` | |
| `goingTo` | `Home` \| `Other` | |
| `destination` | string\|null | free text, only when `goingTo = Other` |
| `mode` | `Student by Self` \| `Parent Accompanying` \| `Guardian Accompanying` \| `with Fellow Students` | |
| `remarks` | string\|null | ≤ 300 chars |
| `status` | `pending` \| `approved` \| `rejected` \| `cancelled` | set by the hostel provider / warden |
| `decidedOn`, `decisionNote` | datetime\|null, string\|null | filled when the provider acts; the UI shows the note under the status |

### 8.3 `POST /parent/hostel-leave-request.php` (auth)

Creates a leave request. Body: `candidateId`, `outAt`, `inAt`, `reason`,
`goingTo`, `destination`, `mode`, `remarks` (same values as 8.2). Server
validates that the child is an active hosteller of this parent
(`hostel_allotted.status = 1`), that `inAt` is after `outAt`, that `outAt` is
not before today, that the span is ≤ 60 days, that `reason`, `goingTo` and
`mode` are from the enums, `destination` (≤ 120 chars) is given when
`goingTo = Other`, `remarks` ≤ 300 chars, and that no pending / approved
request already overlaps the dates. Each failure is a `400` with a
human-readable `error`; a non-hosteller child is `400` too, a child that is
not the parent's is `403`.

Responds with the stored request (status `pending`, `days` computed
server-side) plus `notified` (how many numbers were messaged) and **notifies
the hostel provider**: an SMS to every `hostelProviderContact` number and to
the warden with the student's name, out / in stamps, days, reason and mode
(`notifiedOn` / `notifiedTo` are stored on the row). The SMS goes through
`vegaSendSMS()` with template code `SMS_HOSTEL_LEAVE`; that code must be
mapped to a MSG91 flow in `secret-credentials/crispr/smsblackbox.php` (flow
variables `student`, `out`, `in`, `days`, `reason`, `mode`). Until it is,
the helper logs "Unknown templateCode" and the request is still stored.

---

## 9. Contacts

### 9.1 `GET /parent/contacts.php?candidateId=` (auth)

Institute-wide contacts from `parent-contacts-config.php` (class teacher,
Director, Academic Head, Technical Head) plus the student's mapped mentor
(`candidate_mentor_mapping` → `mentor_profile`) as a second primary contact.

```json
[
  { "id": "class-teacher", "role": "Class Teacher", "name": "Afshana Khaleel", "phone": "7736758977", "email": null, "photo": null, "note": "Day-to-day attendance and classroom matters", "primary": true },
  { "id": "director", "role": "Director", "name": "Amith C S", "phone": "9633104657", "email": "amith@crisprlearning.com", "photo": null, "note": "Admissions, fees and escalations", "primary": false },
  { "id": "academic-head", "role": "Academic Head", "name": "Arathi Krishna", "phone": null, "email": "arathi@crisprlearning.com", "photo": null, "note": "Syllabus, tests and academic progress", "primary": false },
  { "id": "technical-head", "role": "Technical Head", "name": "Abhijith C S", "phone": "9043960876", "email": null, "photo": null, "note": "App access, login and portal issues", "primary": false }
]
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | stable slug |
| `role` | string | shown as the label |
| `name` | string | |
| `phone` | string\|null | **10 digits, no spaces**; UI builds `tel:+91…` and `https://wa.me/91…` |
| `email` | string\|null | UI builds `mailto:` |
| `photo` | string\|null | initials fallback when null |
| `note` | string\|null | one line under the name |
| `primary` | bool | `true` marks the child-specific contact, shown first and highlighted |

Order: primary contacts first (class teacher, then mentor), then the
institute list in config order. Buttons (Call / WhatsApp / Email) appear only
for non-null channels. Edit `parent-contacts-config.php` to change names or
numbers; no deploy of the SPA is needed.

---

## 10. Non-functional requirements

- **Latency.** Each portal endpoint should answer within ~500 ms at p95 for a
  child with two years of history; the Student 360 payload is the heaviest and
  may be cached per child for 10–15 minutes.
- **Payload size.** Student 360 with three months of attendance is ~15 KB;
  keep images as URLs, never base64.
- **OTP abuse.** Reuse the existing IP + number throttling; cap OTP attempts
  per key (e.g. 5) before requiring a new OTP.
- **PII.** Only the parent's own children are ever returned. Mask payment
  references (card last 4, partial UTR). Do not return other students' names
  in rank data.
- **Audit.** Log parent logins (parent id, ip, user agent) in the same style
  as `login_attempts`.
- **Token isolation.** Parent tokens must be rejected by `jwt.auth` /
  `admin.auth` middleware, and student/admin tokens by the parent middleware.
- **Time zone.** All "today" calculations in `Asia/Kolkata`.

---

## 11. Decisions taken and remaining questions

Decided during implementation (change on request):

1. **Inactive candidates** are listed with `status: "inactive"`; per-child
   endpoints still answer for them.
2. **Unknown mobile** follows the existing new-parent registration flow;
   the portal then shows the "no student linked" notice.
3. **Performance score** = mean of the last 5 exam attempts as a % of
   `scoreBase`; subject scores = section accuracy over those attempts.
4. **Mentor note** is generated from the numbers (no mentor-notes table).
5. **Unmarked class days** count as absent from the day attendance started.
6. **Installments** live in `payments_course_fee`; **rent** in
   `payments_hostel_fee`. Both are read-only for the portal.
7. **Class teacher** is configured in `parent-contacts-config.php`; the
   student's mentor is added automatically from the mapping.
8. **Marks units.** `exam_attempts.finalScore`, `quiz_attempts.finalScore`
   and `candidate_profile_stats` store marks × 100 (`user/exam-report.php`);
   every parent payload divides back to marks / percent (2026-09-19; the
   earlier `student-360.php` returned the raw ×100 values).
9. **Leave requests** live in `hostel_leave_requests`; decisions
   (`leaveStatus`, `decisionNote`) are written by office tooling, not the
   portal.
10. **Wrappers** for student endpoints call the app's own origin with a
    minted student token rather than duplicating the student logic.

Still open:

- **Office tooling** to maintain the two payment ledgers (today: SQL).
- **Portal domain / CORS.** The scripts send `Access-Control-Allow-Origin: *`
  like the rest of the app; tighten to the portal origin when it has one.
- **Quiz attempts** are not part of the test list yet.
- **Bed / mess** for hostel rooms are not modelled anywhere.
- **Token revocation** on logout (no token store exists).
- **Leave SMS template.** `SMS_HOSTEL_LEAVE` needs a MSG91 flow id in
  `smsblackbox.php`; the leave decision (approve / reject) UI for the hostel
  provider does not exist yet.

## 12. Frontend integration checklist

- [x] `src/lib/parentApi.js` targets every path above; `VITE_API_BASE` is
      the CrisprTechApp origin and `VITE_DEMO_MODE` defaults to off.
- [x] `mentor`, `batch` and empty test / attendance data are null-safe in
      `Student360Page.jsx`.
- [x] Parents with no mapped student see a notice instead of empty screens.
- [ ] Run `parent-schema.sql` (sections 1–7; section 7 adds `hostel_leave_requests`)
      and `parent-payments-schema.sql` on production.
- [ ] Confirm the production origin for the PHP APIs (`https://crisprtech.app`
      is assumed in `src/lib/api.js`).
- [ ] Add a `status` badge to the switcher for inactive students if wanted.
