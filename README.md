🔐 Secure File Sharing Using Blockchain

A secure web-based system for file upload, verification, sharing, and download using encryption, hashing, and blockchain-style integrity checking.

📌 Overview

This project ensures secure file transfer by combining AES-256 encryption for confidentiality and SHA-256 hashing with a blockchain-style ledger for integrity verification. It protects files from unauthorized access and detects any tampering.

The system also implements secure authentication mechanisms such as OTP verification, JWT-based login, and password hashing using bcrypt to ensure that only authorized users can access the system.



🚀 Features

User Registration with OTP Verification

Secure Login using JWT Authentication

Password Hashing using bcrypt

Secure File Upload

AES-256-CBC File Encryption

SHA-256 Hashing for Integrity

Blockchain-style Ledger for Tamper Detection

File Verification System

Secure File Sharing

Controlled File Download

Unauthorized Access Protection



🛠️ Tech Stack

Frontend

HTML

CSS

JavaScript

Backend

Node.js

Express.js

Database

MongoDB



📊 System Workflow

User registers and verifies account using OTP

User logs in securely

User uploads a file


System performs:

Generates SHA-256 hash

Encrypts file using AES-256-CBC

Stores encrypted file

Stores hash in blockchain-style ledger



User can:

Verify file integrity

Share file securely

Download file safely



🚀 Future Improvements
Cloud Storage Integration (AWS S3 / Firebase)

Real Blockchain Integration

Multi-Factor Authentication (MFA)

Role-Based Access Control

File Expiry & Auto-Delete


📜 License

This project is developed for academic purposes.


👨‍💻 Author

Saurav Timilsina
