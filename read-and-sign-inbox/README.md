# Read and Sign — inbox

ضع ملفات التعميم هنا بصيغة **PDF**.

ثم شغّل المزامنة (يدوياً أو دورياً):

```bash
python scripts/sync_read_and_sign.py
```

السكربت ينسخ الملفات إلى `docs/read-and-sign/files/` ويحدّث `docs/read-and-sign/circulars.json`.

يمكن تغيير مسار المصدر:

```bash
python scripts/sync_read_and_sign.py --inbox "D:\OneDrive\Read and Sign"
```
