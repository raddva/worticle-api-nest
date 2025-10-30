# NestJS SQL JWT REST API

Sebuah aplikasi REST API sederhana yang dibangun dengan NestJS dan TypeScript. Aplikasi ini mendemonstrasikan operasi CRUD dasar, koneksi ke database SQL (PostgreSQL), dan autentikasi API menggunakan JSON Web Tokens (JWT).

## Fitur

- **Autentikasi JWT**: Endpoint `POST /auth/register` dan `POST /auth/login` untuk mengelola pengguna dan menghasilkan token JWT.
- **CRUD Terkait**: Operasi CRUD untuk `Users` (Pengguna) dan `Posts` (Postingan).
- **Relasi SQL**: Relasi _database_ (One-to-Many) di mana satu `User` dapat memiliki banyak `Posts`.
- **Endpoint Terlindungi**: Endpoint (seperti `POST /posts` dan `GET /users`) dilindungi menggunakan _JWT Guard_, hanya memperbolehkan akses bagi pengguna yang telah login.
- **E2E Testing**: Termasuk _file_ tes E2E (`test/auth.e2e-spec.ts` dan `test/posts.e2e-spec.ts`) untuk memvalidasi alur autentikasi dan pembuatan _post_.

## Instalasi dan Konfigurasi

1.  **Clone repositori:**

    ```bash
    git clone [URL-REPOSITORI-ANDA]
    cd [NAMA-FOLDER-PROYEK]
    ```

2.  **Install dependensi:**

    ```bash
    npm install
    ```

3.  **Konfigurasi Lingkungan (.env)**
    Buat _file_ `.env` di _root_ proyek. _File_ ini akan berisi kredensial database dan kunci rahasia JWT Anda.

    ```env
    # Konfigurasi Database (PostgreSQL)
    DB_HOST=localhost
    DB_PORT=5432
    DB_USERNAME=postgres
    DB_PASSWORD=password_postgres_anda
    DB_NAME=worticle

    # Kunci Rahasia JWT (ganti dengan string acak yang kuat)
    JWT_SECRET=SANGAT_RAHASIA
    ```

4.  **Database**
    Pastikan Anda memiliki _server_ database PostgreSQL yang berjalan dan sesuai dengan konfigurasi di `.env`.

## Menjalankan Aplikasi

1.  **Mode Development (dengan _hot-reload_)**

    ```bash
    npm run start:dev
    ```

    Saat server berjalan, TypeORM akan secara otomatis menyinkronkan _entity_ (`User`, `Post`) dan membuat tabel di database `worticle` Anda.

2.  **Mode Produksi**
    ```bash
    npm run build
    npm run start:prod
    ```

## Menjalankan Tes

Proyek ini dilengkapi dengan tes E2E (End-to-End) menggunakan Jest dan Supertest untuk memvalidasi _endpoint_ API.

```bash
npm run test:e2e
```

## Penjelasan Pola Arsitektur

Pola yang Digunakan: Modular Monolith
Aplikasi ini menggunakan pola Modular Monolith, yang merupakan arsitektur standar dan yang sangat direkomendasikan oleh framework NestJS.

Dalam pola ini, aplikasi tidak dibagi menjadi microservice yang terpisah, melainkan diatur sebagai satu aplikasi tunggal (monolith) yang dibagi menjadi modul-modul fungsional berdasarkan domain bisnis.

Struktur proyek ini dibagi menjadi modul-modul utama:

- AuthModule: Bertanggung jawab atas registrasi, login, dan strategi JWT.

- UsersModule: Bertanggung jawab atas logika bisnis dan akses data yang terkait dengan pengguna.

- PostsModule: Bertanggung jawab atas logika bisnis dan akses data untuk postingan.

### Alasan Penggunaan Pola Ini

Pola ini dipilih karena memberikan keseimbangan terbaik antara kesederhanaan pengembangan dan skalabilitas jangka panjang untuk sebagian besar aplikasi:

1. Pemisahan Tanggung Jawab (Separation of Concerns) Setiap modul memiliki satu tanggung jawab yang jelas. Di dalam setiap modul, tanggung jawab dibagi lagi secara konsisten:

- Controller: Hanya mengurus lapisan HTTP (menerima request, memvalidasi DTO, mengembalikan response).

- Service: Berisi semua logika bisnis. Service tidak tahu apa-apa tentang HTTP dan dapat digunakan kembali.

- Entity/Repository (TypeORM): Mengurus definisi skema dan akses ke database.

2. Kemudahan Pengujian (Testability) Pola ini sangat mudah dites. Kita dapat dengan mudah menguji logika bisnis (UsersService) secara terisolasi (sebagai unit test) atau menguji seluruh alur HTTP (auth.e2e-spec.ts) sebagai tes E2E. Pemisahan ini membuat testing menjadi jelas dan tidak rapuh.

3. Skalabilitas dan Pemeliharaan (Scalability & Maintainability)

- Awal Proyek: Pola ini cepat untuk dikembangkan karena tidak ada kerumitan komunikasi antar service.

- Pertumbuhan Proyek: Jika aplikasi tumbuh sangat besar, modul-modul ini sudah "siap" untuk diekstraksi. Misalnya, jika PostsModule menjadi terlalu kompleks, modul tersebut dapat dipindahkan menjadi microservice sendiri dengan perubahan minimal pada modul Auth atau Users.
