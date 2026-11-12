# Video studio — Bangla YouTube videos from the archive

`backend/run_studio.py` turns the crime archive into finished, ready-to-upload
Bangla videos: narration, animated charts and maps, burned-in captions, a
thumbnail, an `.srt` subtitle file, and a title, description and tags.

Nothing is uploaded automatically. You watch each video, check it against
its sources, and upload it yourself.

## The four programmes

| Command | Programme | Shape | Length | Script |
|---|---|---|---|---|
| `brief` | সাপ্তাহিক অপরাধ চিত্র — the week in numbers: total, trend, crime types, hotspot map, safety tips | 16:9 (add `--aspect 9:16` for a Short) | ~1–2 min | Templates only, so every number is exactly the API's |
| `daily` | আজকের অপরাধ সংবাদ — today's 3–5 best-corroborated stories | 9:16 Short | ~45–70 s | Gemini, under the safety rules (template fallback) |
| `case` | ঘটনার বিস্তারিত — one case in depth, with context and the 90-day pattern | 16:9 | ~1.5–5 min | Gemini, needs `GEMINI_API_KEY` |
| `explainer` | সতর্ক থাকুন — how a scam or crime pattern works and how to protect yourself (from the TTP library) | 9:16 Short | ~60–90 s | Gemini, needs `GEMINI_API_KEY` |

Each run writes `studio_out/<slug>/`:

```
video.mp4        H.264 + AAC, 1080p (1920×1080 or 1080×1920), 30 fps
thumbnail.jpg    1280×720
captions.srt     upload as Bangla subtitles (helps search)
description.txt  paste into YouTube; includes sources, disclaimer, helplines
metadata.json    title, tags, duration, sources, warnings
script.md        the narration with timestamps + a review checklist  ← read first
```

## Running it

On GitHub (recommended): **Actions → Video studio → Run workflow**, pick the
programme, then download the `studio-<n>` artifact when it finishes. It also
runs on a schedule:

- every day at 19:41 BST: the daily Short
- every Friday at 10:23 BST: the weekly brief, as a long video and a Short
- every Tuesday at 18:17 BST: a safety explainer Short

It uses the `BACKEND_URL` and `GEMINI_API_KEY` secrets the ingest job
already has.

Locally:

```bash
sudo apt-get install ffmpeg libraqm0      # libraqm shapes Bangla text
pip install -r backend/requirements.txt -r backend/studio/requirements.txt
export BACKEND_URL=https://bd-crime-monitor-api.onrender.com
export GEMINI_API_KEY=...                 # for daily / case / explainer
python backend/run_studio.py brief
python backend/run_studio.py daily --voice female
python backend/run_studio.py case --incident-id <uuid>
python backend/run_studio.py explainer --topic fraud-otp-account-takeover
```

To try it offline, use the bundled sample data:
`python backend/run_studio.py brief --fixture backend/studio/sample_data.json`.
The sample records are invented, and every frame of a sample render is
watermarked **নমুনা ডেটা**. Never upload one.

Useful flags: `--aspect`, `--voice male|female`, `--rate +8%`,
`--channel "চ্যানেলের নাম"`, `--music track.mp3` (royalty-free only, e.g. from
the YouTube Audio Library), `--script-only` (skip the video and write only
the script, metadata and thumbnail).

## Voice

The narrator is Microsoft's free Bangla neural voice through `edge-tts`
(`bn-BD-PradeepNeural` male or `bn-BD-NabanitaNeural` female). If that is
unreachable, the studio falls back to Gemini TTS (`STUDIO_TTS_MODEL`). If
neither works, the video is silent and `script.md` says not to upload it.

## Editorial rules (enforced in `safety.py`)

- **No individual story videos about sexual or domestic violence.** Under
  Bangladeshi law (Nari o Shishu Nirjatan Daman Ain 2000, s.14; Children Act
  2013, s.28) it is an offence to publish anything that identifies these
  victims or a child. These incidents still count in the weekly totals.
- **Only approved, public records.** The studio reads the public API with a
  guest token, exactly as a visitor does. Unverified records never become
  stories, and corroborated ones are picked first.
- **No names, no guilt.** Scripts never name any person. Suspects are
  `অভিযুক্ত` (accused). Every claim is attributed to its source. Phone
  numbers and e-mail addresses are stripped from model output.
- **No graphic detail.** Graphic wording keeps a video out of ads, so
  `script.md` flags any it finds.
- **Sources in every description**, plus a disclaimer that these are
  published reports, not official crime statistics.

## Growing the channel (practical notes)

- **Shorts bring viewers, long videos earn money.** Watch hours from Shorts
  don't count toward the Partner Program's 4,000 hours; brief and case videos
  do. Upload the weekly brief in both shapes.
- **Make each upload your own.** YouTube's *inauthentic content* policy
  demonetises mass-produced, template-only channels. Change the hook, add a
  line of your own, pick the thumbnail. The data is already original, which
  helps a lot.
- **Upload `captions.srt`** as Bangla subtitles and keep the generated
  description (sources and helplines build trust and search ranking).
- Bangla ad rates are low (often under $1 per 1,000 views). Plan on
  sponsorships, Facebook cross-posting, and channel memberships as well.

## Files

```
run_studio.py        command line
studio/formats.py    the four programmes: data → Episode (scenes + metadata)
studio/safety.py     editorial guardrails, disclaimer, helplines
studio/llm.py        Gemini REST: JSON scripts and fallback TTS
studio/voice.py      edge-tts / Gemini / silent narration, audio stitching
studio/visuals.py    every scene layout, captions, thumbnail (Pillow)
studio/render.py     frames → ffmpeg, captions.srt, script.md, metadata
studio/bangla.py     Bangla digits, dates, category and place names
studio/source.py     public API client and JSON fixture reader
studio/assets/       Hind Siliguri font (SIL OFL), Bangladesh outline (Natural Earth, public domain)
```
