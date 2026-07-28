# Σύστημα Προσκόπων — Οδηγίες Δημοσίευσης

## 1. Ανέβασμα στο GitHub
1. Πήγαινε στο github.com → **New repository** → όνομα π.χ. `proskopoi-progress` → **Create repository**
2. Στην επόμενη σελίδα πάτα **"uploading an existing file"**
3. Σύρε **όλα** τα αρχεία και φακέλους αυτού του project μέσα (εκτός από `node_modules` αν υπάρχει)
4. **Commit changes**

## 2. Σύνδεση με Vercel
1. vercel.com → **Add New → Project**
2. Επίλεξε το repository `proskopoi-progress`
3. Πριν πατήσεις Deploy, άνοιξε **"Environment Variables"** και πρόσθεσε:
   - `VITE_SUPABASE_URL` = το Project URL σου (Supabase → Project Settings → API)
   - `VITE_SUPABASE_ANON_KEY` = το **anon public** key (ίδια σελίδα)
4. **Deploy**

Σε ~1 λεπτό θα έχεις ένα link (π.χ. `proskopoi-progress.vercel.app`) — αυτό είναι η ζωντανή εφαρμογή σου.

## 3. Εγκατάσταση ως εφαρμογή κινητού (PWA)
- **Android/Chrome:** άνοιξε το link → μενού (⋮) → "Προσθήκη στην αρχική οθόνη"
- **iPhone/Safari:** άνοιξε το link → κουμπί Κοινοποίησης → "Προσθήκη στην Αρχική οθόνη"

## 4. Προσθήκη νέου χρήστη (πρόσκοπος/βαθμοφόρος)
1. Supabase → Authentication → Users → **Add user** (email + κωδικός, Auto Confirm: Yes)
2. Αντίγραψε το **User UID**
3. Μέσα στην εφαρμογή, ως admin: **Χρήστες → Σύνδεση νέου προφίλ** → βάλε το UID, όνομα, ρόλο
