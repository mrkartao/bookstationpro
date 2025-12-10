# توقيع الكود (Code Signing) - Windows Installer

هذا المستند يشرح كيفية الحصول على شهادة توقيع الكود وإعدادها لاستخدامها تلقائيًا في GitHub Actions مع `electron-builder` لبناء مثبتات Windows موقع رقميًا.

## لماذا توقيع الكود؟
- يمنح المستخدمين ثقة أن البرنامج لم يُعدّل من طرف ثالث.
- يقلل تحذيرات SmartScreen وWindows Defender عند التثبيت.

## نوع الشهادة الموصى به
- شهادة EV Code Signing (مفضّلة): أكثر ثقةً عند أنظمة Windows وتقلّل تحذيرات SmartScreen.
- شهادة OV/Standard Code Signing: أقل تكلفة، تعمل أيضًا ولكن قد تظهر تحذيرات أكثر.

## خطوات الحصول على الشهادة
1. اشترِ شهادة توقيع كود من مُصدّر شهادات موثوق (مثال: DigiCert, Sectigo, GlobalSign، أو موزّعين محليين).
2. ستستلم عادةً ملف PFX (`.p12`/`.pfx`) يحتوي على المفتاح الخاص والشهادة. احتفظ بكلمة المرور (`PFX password`).

## إعداد الشهادة لاستخدامها في GitHub Actions

نستخدم متغيّرات أسرار في GitHub Actions بالأسامي التالية:
- `CSC_BASE64` : محتوى ملف `.p12` مشفّرًا بـ Base64.
- `CSC_KEY_PASSWORD` : كلمة مرور ملف `.p12`.

### تحضير ملف base64 (على Windows PowerShell)
1. افترض أن ملف الشهادة اسمه `codesign.p12`:

```powershell
# قراءة الملف وتحويله إلى Base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\codesign.p12')) > cert.base64.txt
```

2. افتح `cert.base64.txt` وانسخ النص كاملاً.

### رفع الأسرار إلى GitHub (واجهة الويب)
1. افتح مستودعك على GitHub → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.
2. أنشئ سِرًا باسم `CSC_BASE64` والصق محتوى `cert.base64.txt` كالقيمة.
3. أنشئ سِرًا آخر باسم `CSC_KEY_PASSWORD` وأدخل كلمة مرور الـ PFX.

بدلاً من الويب، يمكنك استخدام GitHub CLI (مثال):

```powershell
# نقترح أولًا حفظ المحتوى في ملف نصي ثم رفعه
gh secret set CSC_BASE64 --body "$(Get-Content -Raw cert.base64.txt)"
gh secret set CSC_KEY_PASSWORD --body "myPfxPassword"
```

> ملاحظة: احرص على أن يكون محتوى `CSC_BASE64` ملفًا واحدًا طويلًا بدون مقطعات أو تغييرات سطر غير متوقعة.

## التحقق في الـ CI
- `electron-builder` يقرأ المتغيّرات `CSC_BASE64` و`CSC_KEY_PASSWORD` تلقائيًا عند وجودها في بيئة البناء، فلا حاجة لكتابة ملف `p12` يدويًا داخل الـ runner.
- مثال: في `GitHub Actions` ضع المتغيرات كـ `secrets` (كما أعددنا أعلاه) وسيتم استخدامها بواسطة خطوة البناء.

## ماذا يحدث إن لم تُوفّر الشهادة
- سيتم إنشاء مثبتات غير موقعة. تعمل على Windows 7+، لكن قد تواجه تحذيرات SmartScreen على أجهزة بعض المستخدمين.

## مصادر ومزودون (أمثلة)
- DigiCert: https://www.digicert.com/
- Sectigo (Comodo): https://sectigo.com/
- GlobalSign: https://www.globalsign.com/

إذا أردت، أستطيع أيضاً:
- إضافة مثال أوتوماتيكي في الـ workflow لفك تشفير `CSC_BASE64` إلى ملف `.p12` داخل الـ runner (ولكن `electron-builder` لا يتطلب ذلك عادة).
- إرشادك لتوقيع يدويًا على جهاز Windows لاختبار الشهادة قبل رفعها إلى CI.

---
ملف هذا مخصّص لمشروع `Book Station Pro` ويمكن تعديله لاحقًا ليتضمّن تعليمات خاصة بعمليات الإصدار والنشر.
