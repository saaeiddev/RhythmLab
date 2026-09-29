# راهنمای نصب RhythmLab — Premiere Pro 26.2.2 / Windows 11

## روش توسعه با UXP Developer Tool
1. Premiere Pro 26.2.2 را باز کنید.
2. UXP Developer Tool را باز کنید.
3. گزینه **Add Plugin** را بزنید و فایل `plugin/manifest.json` را انتخاب کنید.
4. روی **Load** بزنید. باید پیام **Load Successful** نمایش داده شود.
5. در Premiere از مسیر **Window > UXP Plugins > RhythmLab** پنل را باز کنید.

## استفاده
1. در Project Panel چند کلیپ و یک فایل موزیک را انتخاب کنید.
2. در RhythmLab روی **Refresh selection** بزنید.
3. In/Out هر کلیپ را بررسی یا ویرایش کنید.
4. Target Duration و Frame Rate را تعیین کنید.
5. برای Beat یا BPM را دستی وارد کنید یا اگر موزیک PCM 16-bit WAV است روی **Analyze selected WAV** بزنید.
6. Preview هر سه حالت Calm / Beat / Build را بررسی کنید.
7. روی **Generate all 3 sequences** بزنید.

## اگر Plugin Load Failed شد
- مطمئن شوید `plugin/manifest.json` را انتخاب کرده‌اید، نه پوشه اشتباه.
- Premiere باید 26.2.x یا جدیدتر باشد.
- Developer Mode/UXP debugging باید فعال باشد.
- بعد از تغییر manifest، plugin را Unload و دوباره Load کنید.

## نکته مهم
نسخه 0.2.0 روی ساختار UXP رسمی Premiere ساخته شده است. تست‌های محاسباتی پاس شده‌اند؛ رفتار نهایی ایجاد و پخش sequence باید روی نصب واقعی Premiere شما نیز تست شود.
