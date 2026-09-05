## OBJECTIVE

You will perform four tasks on this open-source `wacrm` project in a single session:

1. **Rebrand** — replace every `wacrm` string with `automacrm` and app name is `Automa CRM`
2. **Clean up** — delete all files not required for the app to run
3. **English only** — remove every non-English translation/locale file and lock the UI language to English

**Hard rules — never break these:**
- Do NOT touch WhatsApp connection logic, socket handlers, or Baileys internals
- Do NOT modify database schemas, column names, or migration files
- Do NOT change `.env` variable *values* — only rename *keys* that contain `wacrm`
- Do NOT touch anything inside `node_modules/`
- Every created file must be complete — no `// TODO` or `...rest of code`

---

## PHASE 0 — FULL EXPLORATION

Run every command. Read every output. Do not write or delete any file until Phase 0 is complete.

```bash
# ── Project snapshot ──────────────────────────────────────
ls -la
cat package.json

# ── Full directory tree ───────────────────────────────────
find . -not \( -path ./node_modules -prune \) \
       -not \( -path ./.git -prune \) \
       -not \( -path ./dist -prune \) \
       -not \( -path ./build -prune \) \
       | sort

# ── ALL wacrm occurrences ─────────────────────────────────
grep -rin "wacrm\|wa-crm\|wa_crm\|WaCRM\|WACRM\|WA CRM" . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=dist --exclude="*.lock" \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.md" --include="*.env*" \
  --include="*.html" --include="*.css" --include="*.yml" --include="*.yaml"

# ── Frontend structure ────────────────────────────────────
cat src/main.jsx 2>/dev/null || cat src/main.tsx 2>/dev/null
cat src/App.jsx  2>/dev/null || cat src/App.tsx  2>/dev/null
cat index.html   2>/dev/null || cat public/index.html 2>/dev/null
cat tailwind.config.js 2>/dev/null || cat tailwind.config.ts 2>/dev/null
cat src/index.css 2>/dev/null || cat src/styles/index.css 2>/dev/null

# ── Existing hooks and contexts ───────────────────────────
find ./src -name "useChat*" -o -name "useConversation*" \
           -o -name "useContact*" -o -name "useMessage*" | head -20
ls src/context/ 2>/dev/null; ls src/hooks/ 2>/dev/null; ls src/store/ 2>/dev/null

# ── ALL locale / i18n / translation files ─────────────────
find . -not \( -path ./node_modules -prune \) \
       -type d \( -name "locales" -o -name "i18n" -o -name "lang" \
                 -o -name "translations" -o -name "locale" \)

find . -not \( -path ./node_modules -prune \) \
       -type f \( -name "*.po" -o -name "*.mo" -o -name "*.pot" \)

find . -not \( -path ./node_modules -prune \) \
       -name "i18n*" -o -name "i18next*"

find . -not \( -path ./node_modules -prune \) \
       -type f -name "*.json" \
  | xargs grep -l '"translation"\|"locale"\|"language"' 2>/dev/null \
  | grep -v node_modules | head -20

grep -rn "i18n\|i18next\|useTranslation\|t(\|locale\|language" src/ \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
  -l 2>/dev/null | head -20

# ── Non-code files (candidates for deletion) ──────────────
find . -not \( -path ./node_modules -prune \) \
       -not \( -path ./.git -prune \) \
       -type f \( -name "*.md" -o -name "*.yml" -o -name "*.yaml" \
                 -o -name "*.sh" -o -name "Dockerfile*" \
                 -o -name "docker-compose*" -o -name ".travis*" \
                 -o -name "CHANGELOG*" -o -name "CONTRIBUTING*" \
                 -o -name "CODE_OF_CONDUCT*" -o -name "SECURITY*" \
                 -o -name "*.png" -o -name "*.jpg" -o -name "*.gif" \) \
  | grep -v node_modules | sort

ls -la .github/ 2>/dev/null && find .github/ -type f | sort

# ── Test and demo files ────────────────────────────────────
find . -not \( -path ./node_modules -prune \) \
       -type f \( -name "*.test.*" -o -name "*.spec.*" \) | sort
find . -not \( -path ./node_modules -prune \) \
       -type f \( -name "*seed*" -o -name "*mock*" -o -name "*demo*" \
                 -o -name "*fixture*" -o -name "*sample*" \) | sort

# ── Env files ─────────────────────────────────────────────
find . -name ".env*" -not -path "*/node_modules/*"
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null

# ── License ───────────────────────────────────────────────
cat LICENSE 2>/dev/null || cat LICENSE.md 2>/dev/null || echo "No LICENSE file found"
```

**After reading all output, produce a written plan with:**
- List of files containing `wacrm` → to be text-replaced
- List of locale/translation files found → which are English, which are not
- List of files to delete (non-code, test, demo, CI/CD)
- Confirm: Is Tailwind CSS installed? Which version?
- Confirm: Is i18n / i18next installed?
- Confirm: What data hooks exist for conversations/contacts/messages?

**Do not proceed to Phase 1 until this plan is written.**

---

## PHASE 1 — DELETE UNNECESSARY FILES

Print `🗑 Deleted: [filepath]` for each deletion. If any file in these categories is required for the app to run, skip it and explain why.

### 1A — Original project documentation
```bash
rm -f CONTRIBUTING.md CODE_OF_CONDUCT.md CHANGELOG.md \
      CHANGELOG.txt SECURITY.md AUTHORS AUTHORS.md
# README.md — DO NOT DELETE — you will rewrite it in Phase 5
```

### 1B — GitHub CI/CD and issue templates
```bash
rm -rf .github/
rm -f .travis.yml .travis.yaml appveyor.yml azure-pipelines.yml \
      bitbucket-pipelines.yml Jenkinsfile sonar-project.properties \
      codecov.yml .coveralls.yml .woodpecker.yml
rm -rf .circleci/ .woodpecker/
```

### 1C — Docker (delete ONLY if you are not using Docker)
```bash
# Check first:
cat docker-compose.yml 2>/dev/null | head -5
# If confirmed not needed:
rm -f Dockerfile Dockerfile.dev docker-compose.yml \
      docker-compose.yaml docker-compose.dev.yml \
      docker-compose.prod.yml .dockerignore
```

### 1D — Original screenshots and demo assets
```bash
# Review first, then delete — never delete src/assets/ or public/assets/
find . -not \( -path ./node_modules -prune \) \
       -not \( -path ./src -prune \) \
       -not \( -path ./public -prune \) \
       -type f \( -name "screenshot*" -o -name "preview*" \) \
       \( -name "*.png" -o -name "*.jpg" -o -name "*.gif" \)
# Delete each result:  rm -f [filepath]
rm -rf docs/screenshots/ screenshots/ docs/images/ 2>/dev/null
```

### 1E — Seed, mock, and demo data
```bash
# Find them, read each one before deleting
# If it populates the original project's demo data: DELETE
# If it initialises the database schema: KEEP
```

### 1F — Test files
```bash
find . -not \( -path ./node_modules -prune \) \
       -type f \( -name "*.test.js" -o -name "*.test.jsx" \
                 -o -name "*.test.ts"  -o -name "*.spec.js" \
                 -o -name "*.spec.jsx" -o -name "*.spec.ts" \)
# Delete each result:  rm -f [filepath]
rm -rf __tests__/ tests/ 2>/dev/null
```

### 1G — Junk files
```bash
find . -name ".DS_Store" -not -path "*/node_modules/*" -delete
find . -name "Thumbs.db" -not -path "*/node_modules/*" -delete
find . -name "*.log"     -not -path "*/node_modules/*" -delete
find . -name "npm-debug.log*" -delete
find . -name "yarn-error.log*" -delete
```

---

## PHASE 2 — BRANDING REPLACEMENT

### 2A — `package.json`
Update these fields:
```json
{
  "name": "automa-crm",
  "version": "1.0.0",
  "description": "Automa CRM — WhatsApp CRM for real estate builders by Automa Studio",
  "author": "Automa Studio <hello@automastudio.in>",
  "homepage": "https://automastudio.in",
  "private": true
}
```
Remove: `"repository"`, `"bugs"`, `"funding"`, `"sponsors"` fields entirely.

### 2B — `index.html`
```html
<title>Automa CRM</title>
<meta name="description" content="Automa CRM — WhatsApp CRM for real estate builders">
<meta name="application-name" content="Automa CRM">
<meta property="og:title" content="Automa CRM">
<meta property="og:site_name" content="Automa CRM">
```
Also add font preconnects and Space Grotesk / Inter / JetBrains Mono if not present:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
  media="print" onload="this.media='all'">
<noscript>
  <link rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
</noscript>
```

### 2C — Environment files
Rename any env variable *key* containing `WACRM` or `WA_CRM`:
```
WACRM_SECRET    →   AUTOMA_CRM_SECRET
WACRM_PORT      →   PORT
WA_CRM_DB_PATH  →   DB_PATH
```
Then find and update all usages in source:
```bash
grep -rn "WACRM_\|WA_CRM_" src/ \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

### 2D — Source code text replacement
```bash
# Run in this exact order (most-specific first)
find src/ -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/WA CRM/Automa CRM/g' {} +
find src/ -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/WaCRM/Automa CRM/g' {} +
find src/ -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/WACRM/AUTOMA_CRM/g' {} +
find src/ -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/wa-crm/automa-crm/g' {} +
find src/ -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/wa_crm/automa_crm/g' {} +
find src/ -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/wacrm/automa-crm/g' {} +

# Apply same to CSS and config files
find src/ -type f -name "*.css" \
  -exec sed -i 's/wacrm/automa-crm/g; s/WaCRM/Automa CRM/g; s/WA CRM/Automa CRM/g' {} +
find . -not \( -path ./node_modules -prune \) \
       -type f \( -name "vite.config.*" -o -name "tailwind.config.*" \
                 -o -name "postcss.config.*" \) \
  -exec sed -i 's/wacrm/automa-crm/g; s/WaCRM/Automa CRM/g' {} +

# Verify — output must be empty
echo "=== Remaining wacrm occurrences (should be empty) ==="
grep -rin "wacrm\|WaCRM\|WACRM\|wa-crm\|wa_crm\|WA CRM" . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude="*.lock" --exclude="LICENSE*"
```

---

## PHASE 3 — ENGLISH ONLY

This is a full language lockdown. After this phase, the app renders only in English and has zero code paths for any other language.

### 3A — Map the i18n system
```bash
# Find the i18n config file
find src/ -name "i18n*" -o -name "i18next*" | grep -v node_modules
find src/ -name "*.config.*" | xargs grep -l "i18n\|locale\|language" 2>/dev/null

# Read the main i18n setup file
# Common locations:
cat src/i18n.js 2>/dev/null || cat src/i18n.ts 2>/dev/null
cat src/i18n/index.js 2>/dev/null || cat src/i18n/index.ts 2>/dev/null
cat src/config/i18n.js 2>/dev/null

# List all translation JSON files
find src/ -name "*.json" | xargs grep -l '"translation"\|"common"\|"nav"' 2>/dev/null
find . -not \( -path ./node_modules -prune \) \
       -path "*/locales/*" -name "*.json" | sort
find . -not \( -path ./node_modules -prune \) \
       -path "*/lang/*"   -name "*.json" | sort

# Find language selector component
grep -rn "language\|locale\|i18n\|changeLanguage\|setLocale" src/ \
  --include="*.jsx" --include="*.tsx" -l
```

### 3B — Delete all non-English locale files

Keep files only where the path or filename clearly indicates English:
`en`, `en-US`, `en-GB`, `en-IN`, `english`

Delete everything else. Common non-English codes to remove:

```bash
# Delete entire non-English locale directories if they exist
for lang in ar bn cs da de el es fa fi fr gu he hi hu id it ja ko ms nl no pl pt ro ru sk sl sv th tr uk ur vi zh; do
  find . -not \( -path ./node_modules -prune \) \
         -type d -name "$lang" | while read d; do
    echo "🗑 Deleting locale directory: $d"
    rm -rf "$d"
  done
  find . -not \( -path ./node_modules -prune \) \
         -type f \( -name "${lang}.json" -o -name "${lang}.ts" \
                   -o -name "${lang}.js"  -o -name "${lang}.po" \) \
         | while read f; do
    echo "🗑 Deleting locale file: $f"
    rm -f "$f"
  done
done

# Delete any translation files with language codes in their paths
find . -not \( -path ./node_modules -prune \) \
       -path "*/locales/*" -type f | grep -v "/en" | grep -v "/en-" | while read f; do
  echo "🗑 Deleting: $f"
  rm -f "$f"
done

# Verify — only English files should remain
echo "=== Remaining locale files (only en/* should appear) ==="
find . -not \( -path ./node_modules -prune \) \
       -path "*/locales/*" -o -path "*/lang/*" -o -path "*/i18n/*" \
  | grep -v node_modules | sort
```

### 3C — Update the i18n configuration file

Read the existing i18n config file found in Step 3A, then rewrite it to:
- Hardcode `lng: 'en'` (or `locale: 'en'`)
- Remove `fallbackLng` array with multiple languages — set to `fallbackLng: 'en'`
- Remove all non-English language imports
- Remove dynamic language detection
- Remove `detector` plugin (no need to detect browser language)

**If using `i18next` + `react-i18next`:**
```js
// src/i18n.js — complete rewrite
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json'; // adjust path from Phase 3A findings

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: 'en',               // locked to English — no detection
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,    // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
```

**If using a custom translation system** (not i18next): Read the config and apply the same principle — hardcode English, remove all other language registrations.

### 3D — Remove language selector from UI

Find and remove or disable the language/locale switcher component:
```bash
# Find the language switcher
grep -rn "LanguageSwitcher\|language-selector\|locale-picker\|changeLanguage\|setLanguage" \
  src/ --include="*.jsx" --include="*.tsx" --include="*.js" -l
```

For each file found:
- If it's a dedicated `LanguageSwitcher.jsx` or `LocalePicker.jsx` → delete the file
- If it's embedded in a Settings page component → remove just that UI block
- If it's in a Navbar or header → remove the language dropdown

```bash
rm -f src/components/LanguageSwitcher.jsx 2>/dev/null
rm -f src/components/LanguageSwitcher.tsx 2>/dev/null
rm -f src/components/LocalePicker.jsx 2>/dev/null
rm -f src/components/ui/LanguageSelector.jsx 2>/dev/null
```

### 3E — Remove language imports throughout the codebase
```bash
# Find every file that imports a non-English translation
grep -rn "import.*\/ar\|import.*\/de\|import.*\/fr\|import.*\/hi\|import.*\/gu\|import.*\/zh\|import.*\/es\|import.*\/pt\|import.*\/ru" \
  src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```
Remove each non-English import line found.

### 3F — Check for hardcoded non-English strings in UI
```bash
# Find any hardcoded non-English UI text (common in original wacrm)
grep -rn "भारत\|বাংলা\|中文\|हिंदी\|العربية\|Deutsch\|Français\|Español\|Português\|Русский" \
  src/ --include="*.jsx" --include="*.tsx" --include="*.js"
```
Replace any found with English equivalents or remove if they are language option labels.

### 3G — Verify English-only lockdown
```bash
# 1. Confirm no non-English locale files remain
find . -not \( -path ./node_modules -prune \) \
       -path "*/locale*" -o -path "*/lang/*" -o -path "*/i18n/*" \
  | grep -v node_modules | sort

# 2. Confirm i18n config only registers 'en'
grep -n "resources\|lng\|language\|locale" src/i18n.js 2>/dev/null \
  || grep -n "resources\|lng\|language\|locale" src/i18n.ts 2>/dev/null

# 3. Confirm no language switcher import remains
grep -rn "LanguageSwitcher\|LocalePicker\|changeLanguage" src/ \
  --include="*.jsx" --include="*.tsx" --include="*.js"
echo "=== If all outputs above look clean, Phase 3 is complete ==="
```

---

## FINAL CHECKLIST

```
REBRAND
[ ] Browser tab shows "Automa CRM"
[ ] Zero wacrm occurrences in source (grep confirms empty)
[ ] package.json name = "automa-crm", private = true
[ ] No repository/bugs/funding fields in package.json

CLEANUP
[ ] .github/ deleted
[ ] CONTRIBUTING.md, CHANGELOG.md, CODE_OF_CONDUCT.md deleted
[ ] Original screenshots deleted
[ ] Test files deleted
[ ] README.md rewritten

ENGLISH ONLY
[ ] Only en/* locale files remain
[ ] i18n config: lng = 'en', only one language in resources
[ ] No LanguageSwitcher component in UI
[ ] No changeLanguage / setLocale calls in source

```