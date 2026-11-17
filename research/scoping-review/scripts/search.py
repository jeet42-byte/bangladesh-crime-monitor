import json, sys, time, urllib.parse, urllib.request
CONCEPT = ('(cybercrime OR "cyber crime" OR "cyber-crime" OR cybercrimes OR "online fraud" OR "internet fraud" OR "cyber fraud" '
 'OR scam OR scams OR phishing '
 'OR hacking OR hacker OR hackers OR "identity theft" OR "data breach" OR ransomware OR sextortion OR "image-based sexual abuse" '
 'OR "revenge porn" OR deepfake OR deepfakes OR cyberbullying OR "cyber bullying" OR "cyber harassment" OR "online harassment" '
 'OR cyberstalking OR "technology-facilitated" OR "online gambling" OR "digital security act" OR "cyber security act" '
 'OR "cyber victimization" OR "cyber victimisation")')
MFS = ('(("mobile money" OR "mobile financial service" OR "mobile financial services" OR bkash OR nagad OR "digital payment" OR "mobile banking") '
       'AND (fraud OR frauds OR fraudulent OR scam OR scams OR crime OR crimes OR theft OR deception))')
PLACES_B = '(india OR indian OR pakistan OR nepal OR "sri lanka" OR bhutan OR maldives OR afghanistan OR "south asia" OR "south asian")'
SOC_FIELDS = 'fields/33|fields/32|fields/12|fields/14|fields/20'  # social sci, psychology, arts&hum, business, economics
def url(tier, cursor="*", per=200):
    if tier == "A":
        f = f'title_and_abstract.search:{CONCEPT} AND (bangladesh OR bangladeshi),publication_year:>2009'
    else:
        f = (f'title_and_abstract.search:{CONCEPT} AND {PLACES_B},publication_year:>2009,'
             f'primary_topic.field.id:{SOC_FIELDS}')
    return 'https://api.openalex.org/works?' + urllib.parse.urlencode({'filter': f, 'per-page': per, 'cursor': cursor})
def get(u):
    for i in range(5):
        try:
            return json.load(urllib.request.urlopen(u, timeout=60))
        except Exception as e:
            print("retry", e, file=sys.stderr); time.sleep(5 * (i + 1))
    raise SystemExit("failed")
if __name__ == "__main__":
    for t in ("A", "B"):
        print(t, get(url(t, per=1))["meta"]["count"])
