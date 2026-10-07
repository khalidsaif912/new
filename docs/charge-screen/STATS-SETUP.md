# إحصاءات مستخدمي شاشة الشحن

التطبيق يرسل معرّفاً عشوائياً لكل تثبيت (بدون اسم أو رقم هاتف).

## تفعيل العداد (مرة واحدة)

1. افتح [script.google.com](https://script.google.com) → مشروع جديد  
2. الصق محتوى `Code.gs` → احفظ  
3. **Deploy → New deployment → Web app**  
   - Execute as: **Me**  
   - Who has access: **Anyone**  
4. انسخ رابط Web app  
5. ضع الرابط في `version.json`:

```json
"statsWebhook": "https://script.google.com/macros/s/XXXX/exec",
"statsDashboard": "https://script.google.com/macros/s/XXXX/exec"
```

6. انشر `version.json` (نفس مسار charge-screen على الموقع)

افتح رابط `statsDashboard` في المتصفح لرؤية:
- إجمالي التثبيتات الفريدة
- النشطون آخر 24 ساعة / 7 أيام

> يحتاج المستخدمون تحديث التطبيق إلى 1.15.0+ ثم فتحه مرة (يفضّل مع إنترنت) ليُحسبوا.
