# Ultimate Contact Cleaner Pro

**A Privacy-First, Client-Side Automation Tool for IT Support & Marketing Professionals.**

## Background
As an IT Support specialist, I often handle large-scale customer databases (tens of thousands of rows). A common challenge is cleaning phone numbers for WA Blast or CRM integration. Manual cleaning is time-consuming and prone to errors. 

This project was built to automate:
1. **Standardizing formats** (converting 08/8/+62 to 628).
2. **Filtering non-mobile numbers** (removing landlines and international numbers).
3. **Removing duplicates** while maintaining data integrity across other columns.

## Key Features
- **Client-Side Processing:** Data is processed directly in the browser using JavaScript. No data is ever sent to a server, ensuring 100% data privacy.
- **Dynamic Column Selection:** Works with any Excel file regardless of column order.
- **Smart Filtering (Regex):** Uses advanced Regular Expressions to distinguish between Indonesian Mobile, Landline (Home/Office), and International numbers.
- **Bulk Processing:** Efficiently handles 50,000+ rows without crashing, unlike standard Excel features.

## Tech Stack
- **Frontend:** HTML5, CSS3 (Modern Dark Mode)
- **Engine:** Pure JavaScript (ES6+)
- **Library:** [SheetJS (xlsx)](https://sheetjs.com/) for lightning-fast Excel parsing.
- **Deployment:** GitHub Pages.

## How to Use
1. **Upload:** Drag & drop your `.xlsx` or `.xls` file.
2. **Configure:** Select the column containing phone numbers.
3. **Clean:** Choose your cleaning preferences (Remove home numbers, duplicates, etc.).
4. **Download:** Get your cleaned Excel file instantly.

## 👨‍💻 About the Author
**xirecentxz**
With over **5 years of experience in IT Support**, I specialize in bridging the gap between technical infrastructure and efficient data management. This project serves as a key milestone in my professional portfolio, demonstrating my transition from manual IT troubleshooting to building scalable, automated web solutions. 

*I am currently expanding my web development portfolio to leverage my deep IT background into creating impactful digital tools.*
