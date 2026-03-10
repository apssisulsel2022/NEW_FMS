# Checklist Dokumentasi (Wajib Saat Ada Perubahan)

Gunakan file ini sebagai checklist setiap kali ada perubahan kode/schema.

## Minimal (selalu)

- Update [CHANGELOG.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/CHANGELOG.md)
  - Tulis perubahan (Added/Changed/Fixed)
  - Cantumkan dampak dan file/module yang berubah

## Jika perubahan menyentuh database

- Update [DATABASE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/DATABASE.md)
  - Tabel baru/kolom baru/index baru
  - Policy RLS baru atau perubahan policy
  - Trigger/function baru

## Jika perubahan menyentuh API

- Update [API.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/API.md)
  - Endpoint baru / perubahan request/response
  - Perubahan auth/permission

## Jika perubahan menyentuh arsitektur/flow

- Update [ARCHITECTURE.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/ARCHITECTURE.md)
  - Flow baru (contoh: publish → jobs)
  - Komponen baru (contoh: worker, edge function)

## Jika perubahan menyentuh dev workflow

- Update [DEVELOPMENT.md](file:///d:/PROYEK%20WEB%20MASTER/APLICASI/NEW_FMS/docs/DEVELOPMENT.md)
  - Script baru
  - Env baru
  - Port baru

