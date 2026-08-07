# User Manual

**Tarombo Hariandja — Marga Hariandja Family Tree**

*Horas!* Welcome to the Hariandja clan family-tree application. This guide explains how to use the site as a Viewer, Editor, or Admin.

> **Language:** **English** (this file) · [Indonesia](./USER_MANUAL.id.md)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Family Tree (for everyone)](#2-the-family-tree-for-everyone)
3. [Logging In](#3-logging-in)
4. [Family Chart](#4-family-chart)
5. [Birthdays](#5-birthdays)
6. [Weddings](#6-weddings)
7. [Your Profile](#7-your-profile)
8. [Exporting the Tree](#8-exporting-the-tree)
9. [Editing Persons & Marriages (Editors)](#9-editing-persons--marriages-editors)
10. [Administering Users & Roles (Admins)](#10-administering-users--roles-admins)
11. [FAQ](#11-faq)

---

## 1. Getting Started

### Do I need an account?

**No.** Anyone can view the family tree without logging in. Accounts are only needed for Editors and Admins who manage the records.

### How to open the site

The site is available via the **Preview Panel** on the right side of your interface. Click **"Open in New Tab"** if you wish to view it in a separate browser window.

### What you'll see

When you first open the site, you'll see:
- A **navigation bar** at the top with the Hariandja clan emblem and the site title "Tarombo Hariandja"
- The **Family Tree** view (the default page) showing the clan *tarombo*
- A **footer** at the bottom showing your current viewing mode

---

## 2. The Family Tree (for everyone)

The Family Tree (*tarombo*) is the heart of the application. It displays the Hariandja clan lineage as a vertical tree, with ancestors at the top and descendants below.

### Understanding the cards

Each person is shown as a card containing:
- A **colored stripe** on the left: blue for males, pink for females
- A **circular avatar** (photo if uploaded, otherwise initials)
- The person's **full name**
- Their **nickname** in quotes (if set)
- **Birth and death years** (e.g., `1990 - kini` means still living)
- A **"✝" symbol** for deceased persons (almarhum)

When a person is married, their **spouse's card** appears immediately to the right, connected by a horizontal line:
- **Solid line** = active marriage
- **Dashed line** = marriage ended (divorce or death)

### Navigating the tree

| Action | How |
|--------|-----|
| **Pan** | Click and drag anywhere on the tree |
| **Zoom in** | Scroll up, or click the **(+)** button in the toolbar |
| **Zoom out** | Scroll down, or click the **(−)** button |
| **Fit to screen** | Click the **expand** button in the toolbar |

### Viewing a person's details

Click any person card to open a detail dialog showing:
- Photo and basic info (name, nickname, gender, generation)
- Birth details (place, date)
- Death details (if applicable)
- Marital status and family relations (father, mother, spouse, children)
- Residential address, phone, religion
- Burial location (name, address, coordinates)

Click **Close** or press `Esc` to dismiss the dialog.

### The legend

At the bottom of the tree view, a legend explains the color coding:
- Blue stripe = Male
- Pink stripe = Female
- Gray card = Deceased
- Solid line = Marriage
- Dashed line = Inactive/ended marriage

---

## 3. Logging In

Only **Editors** and **Admins** need to log in. If you're just viewing the tree, skip this section.

### Steps

1. Click the **"Editor / Admin login"** button in the top-right corner.
2. Enter your **email** and **password**.
3. Click **Sign in**.
4. You'll see a "Welcome back!" notification and the navigation bar will update to show all pages you have access to.

### Demo accounts (for testing)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hariandja.id` | `admin123` |
| Editor | `editor@hariandja.id` | `editor123` |

> ⚠️ Change these in a real deployment via Admin → Users.

### Signing out

Click your name/avatar in the top-right corner, then select **Sign out** from the dropdown menu.

---

## 4. Family Chart

*Available to: Editors and Admins*

The Family Chart is an alternative view of the same data, presented as an **indented hierarchy** (like a file explorer tree). It's useful for seeing the structure at a glance without the visual complexity of the full tree.

### What it shows

- Each person is a row with their avatar, name, nickname, generation, and birth/death years
- Spouses appear in a smaller box to the right of their partner
- Children are indented under their parent, connected by vertical lines
- The number of children for each person is shown on the right

### Tips

- **Scroll** vertically to navigate through generations
- Click any person row to open their detail dialog
- The chart is sorted by birth order within each family

---

## 5. Birthdays

*Available to: Editors and Admins*

The Birthdays page shows upcoming birthdays of living clan members, sorted by how soon they occur.

### Sections

- **Today** — birthdays happening today (highlighted)
- **Coming up (next 30 days)** — birthdays in the next month
- **Later this year** — remaining birthdays this year

### Each card shows

- Avatar and name (with nickname)
- Generation number
- Birth date (day and month)
- Place of birth
- **Countdown** ("in 5d", "in 23d")
- **Upcoming age** they will turn
- The day of the week and date the birthday falls on

---

## 6. Weddings

*Available to: Editors and Admins*

The Weddings page shows wedding anniversaries of clan couples, sorted by next occurrence.

### Sections

- **Upcoming anniversaries** — anniversaries in the next 60 days
- **Later this year** — remaining anniversaries

### Each card shows

- Couple's avatars (husband and wife overlapping)
- Both names
- Marriage date
- **Countdown** to the next anniversary
- **Years** they will have been married
- An "ended" badge if the marriage is no longer active

---

## 7. Your Profile

*Available to: Editors and Admins*

The Profile page lets you manage your own account. **Your account data is separate from the genealogy records** — changing your password does not affect the family tree.

### What you can do

- **View** your account summary (name, email, role, linked person)
- **Edit** your display name, email, and password
- **See your permissions** — which pages and actions your role allows

### Changing your password

1. Go to **Profile**
2. In the "Edit details" card, enter a new password in the "New password" field
3. Leave it blank to keep your current password
4. Click **Save changes**

### Linking to a person record

If your account is linked to a person in the tree, the linked person's name shows in your profile summary. This link is set by an Admin (see [Administering Users](#10-administering-users--roles-admins)).

---

## 8. Exporting the Tree

*Available to: Editors and Admins (requires `exportData` permission)*

You can export the family tree in five formats. Every export includes the Hariandja clan emblem as a **centered watermark**.

### Steps

1. Go to the **Family Tree** view
2. Click the **Export** button in the toolbar
3. Optionally edit the **Document title** (defaults to "Tarombo Hariandja")
4. Toggle the **Watermark** and **Background texture** on or off
5. Click one of the five export options:

| Option | Best for |
|--------|----------|
| **PDF (single page)** | Quick overview on one A4 page |
| **Multiple PDFs (paginated)** | Printing a large tree on standard A4 paper |
| **Large-format PDF** | Poster printing or archiving the full tree |
| **PNG image** | High-quality digital sharing |
| **JPG image** | Email or messaging (smaller file) |

The file downloads automatically to your browser's downloads folder.

### Tips

- For very large trees, prefer **Large-format PDF** (multi-page has a 60-page safety limit)
- PNG and JPG are rendered at 2× resolution for crisp output
- The watermark is always centered and sized proportionally to the file

---

## 9. Editing Persons & Marriages (Editors)

*Available to: Editors and Admins (requires `managePersons` / `manageSpouses` permissions)*

### Adding a new person

1. Go to **Family Tree**
2. Click the **Add** button in the toolbar
3. Select **Person** from the dropdown
4. In the dialog, switch to the **Edit** tab
5. Fill in the details (see fields below)
6. Click **Save**

### Editing an existing person

1. Click any person card in the tree (or a row in the Family Chart)
2. In the detail dialog, switch to the **Edit** tab
3. Modify the fields
4. Click **Save**

### Person fields

| Section | Fields |
|---------|--------|
| **Identity** | Full name, nickname, gender, generation |
| **Birth** | Place of birth, date of birth, birth order |
| **Death** | Date of death (leave blank if living) |
| **Contact** | Residential address, phone number, religion |
| **Status** | Marital status (single/married/widowed/divorced) |
| **Photo** | Upload a photo (PNG/JPG/WebP/GIF, max 8MB) |
| **Family relations** | Father, Mother, Official parent (tree position) |
| **Burial** | Burial name, address, latitude, longitude |

### Important: Father, Mother, vs. Official Parent

- **Father** and **Mother** are biological/descent references — they don't affect where the person appears in the tree.
- **Official parent** determines the person's position in the tree. A person with no official parent becomes a root of a new branch.

### Adding a marriage

1. Go to **Family Tree**
2. Click **Add** → **Marriage**
3. Select the **husband** (must be male) and **wife** (must be female)
4. Enter the **marriage date** (optional)
5. Toggle **Active marriage** (a person can have only one active spouse at a time)
6. Click **Save**

### Rules enforced

- A **man** can have at most **one active spouse**
- A **woman** can have at most **one active spouse**
- If a spouse passes away (date of death set on their person record), the **divorce date is set automatically** to their death date the next time marriage records are viewed or edited
- A person **cannot be their own parent** (cycle prevention is enforced)

### Deleting a person

1. Open the person's detail dialog
2. Switch to the **Edit** tab
3. Click the **Delete** button (red, bottom-left)
4. Confirm the deletion

> ⚠️ Deleting a person clears all references to them (children's parent fields, spouse records, user links). This cannot be undone.

---

## 10. Administering Users & Roles (Admins)

*Available to: Admins only (requires `manageUsers` / `manageRoles` permissions)*

The Admin page has two tabs: **Users** and **Roles**.

### Managing users

1. Go to **Admin** → **Users** tab
2. You'll see a table of all user accounts with their name, email, role, linked person, and status

#### To add a user
1. Click **Add user**
2. Fill in: name, email, password, role, optional linked person
3. Toggle **Active** (inactive users cannot log in)
4. Click **Save**

#### To edit a user
1. Click the **pencil icon** next to a user
2. Modify any field (leave password blank to keep current)
3. Click **Save**

#### To disable a user
- Toggle the **Active** switch in the table — disabled users cannot log in but their account is preserved

#### To delete a user
1. Click the **trash icon** next to a user
2. Confirm
- You **cannot delete your own account**

### Managing roles (RBAC)

1. Go to **Admin** → **Roles** tab
2. You'll see cards for each role showing its permissions

#### Built-in roles
- **Viewer** — read-only family tree access (system role, cannot delete)
- **Editor** — all pages + person/marriage management (system role, cannot delete)
- **Admin** — full access (system role, cannot delete)

> You **can edit** the permissions of built-in roles, but you **cannot delete** them.

#### To create a custom role
1. Click **Add role**
2. Enter a **Role name** and **Description**
3. Toggle the **Pages** this role can access:
   - Family Tree, Family Chart, Birthdays, Weddings, Profile
4. Toggle the **Actions** this role can perform:
   - Manage persons, Manage marriages, Manage users, Manage roles, Export data
5. Click **Save**

#### To edit a role
1. Click the **pencil icon** on a role card
2. Toggle permissions as needed
3. Click **Save**

#### To delete a custom role
1. Click the **trash icon** on a custom role card
2. Confirm
- You can only delete roles with **no users assigned**. Reassign users first.

### Example: creating a "Contributor" role

Suppose you want a role that can edit persons but not marriages, and cannot export:

1. Admin → Roles → **Add role**
2. Name: "Contributor"
3. Pages: enable Family Tree, Family Chart, Birthdays, Weddings, Profile
4. Actions: enable **Manage persons** only
5. Save
6. Assign this role to users via Admin → Users → Edit

---

## 11. FAQ

### I can't see the Birthdays/Weddings/Profile pages!

Those pages require an account. If you're not logged in, you're viewing as a **Viewer** and can only see the Family Tree. Ask an Admin for an account.

### I logged in but still can't see certain pages.

Your role may not have permission for those pages. Check **Profile → Your permissions**, or ask an Admin to adjust your role.

### The tree is too big to see all at once.

Use the **zoom out** button or scroll to zoom out, then **drag** to pan. You can also use the **Fit to screen** button to auto-fit the whole tree. For a permanent overview, export a **PDF (single page)**.

### How do I add a person who married into the clan?

1. Add the person normally (no official parent — they'll be a root)
2. Add a **marriage record** linking them to their Hariandja spouse
3. The tree-building logic will automatically attach them as a spouse card next to their partner

### A spouse passed away. Do I need to set the divorce date manually?

**No.** When you set the date of death on a person's record, the system automatically sets the divorce date on their active marriage record the next time marriage data is loaded. You'll see the marriage line change from solid to dashed.

### Can I undo a deletion?

**No.** Deletions are permanent. If you accidentally delete a person, you'll need to recreate them and re-link their family relations. Always double-check before confirming a delete.

### How do I change my password?

Go to **Profile → Edit details**, enter a new password, and click **Save changes**.

### The watermark/logo isn't showing on my export.

Make sure the **Watermark** toggle is ON in the export dialog. If the emblem still doesn't appear, the image file may not have loaded — try the export again after a moment.

### How do I report incorrect genealogy data?

Contact an Editor or Admin. They can correct any person's details via the edit dialog. If you are an Editor, navigate to the person, open their card, switch to the Edit tab, and make the correction.

---

*For technical details, see [TECHNICAL_DOC.md](./TECHNICAL_DOC.md). For project status, see [PROJECT_STATUS.md](./PROJECT_STATUS.md).*

*Horas! — God bless the Hariandja clan.* 🙏
