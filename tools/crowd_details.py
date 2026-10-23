# Single source of truth for The Crowd "more detail" fields -> JS (index.html) + SQL (supabase/details.sql)
import json
AGE=['20–24','25–29','30–34','35–39','40–49','50+']
P=[ # person fields: key, label (future/neutral), options, multi-max
 ('age','Age',AGE,0),
 ('height','Height',['Under 5′4″','5′4″–5′7″','5′8″–5′11″','6′0″–6′2″','6′3″+'],0),
 ('job','Work',['Tech','Creative/arts','Healthcare','Finance/business','Law','Education','Trades','Hospitality','Student','Founder','Other'],0),
 ('edu','Education',['High school','Some college','Bachelor’s','Master’s','Doctorate/MD/JD'],0),
 ('want','Looking for',['Casual','Dating','Relationship','Marriage','Not sure'],0),
 ('kids','Wants kids',['Wants kids','Open to it','Doesn’t want','Not sure'],0),
 ('drinks','Drinks',['Never','Socially','Often'],0),
 ('smokes','Smokes',['No','Sometimes','Yes'],0),
 ('religion','Religion matters',['Not really','Somewhat','A lot'],0),
 ('politics','Politics matter',['Not really','Somewhat','A lot'],0),
 ('past','History',['Never married','Divorced','Has kids','Divorced + kids'],0),
 ('vibe','Vibe (up to 3)',['Funny','Adventurous','Ambitious','Chill','Nerdy','Artsy','Outdoorsy','Homebody','Social','Romantic','Sarcastic','Sporty'],3),
]
C=[ # date context (upcoming -> future tense)
 ('talking','How long have you been talking?',['Just matched','Under a week','1–4 weeks','1+ month'],0),
 ('msgs','How much are you messaging?',['Barely','A few a day','All day'],0),
 ('chem','Chemistry so far',['Low','Medium','High','Off the charts'],0),
 ('asked','Who asked?',['I asked','They asked','Mutual'],0),
 ('act','What are you doing?',['Coffee shop','Bar','Restaurant','Hike','Museum/gallery','Show/concert','Sports/game','Cooking','Beach','Other'],0),
 ('tod','Time of day',['Morning','Afternoon','Evening','Late night'],0),
 ('num','Which date will it be?',['1st','2nd','3rd+'],0),
]
T=[('like','What I like about them',80),('flag','Green or red flag so far',80)]
ALLOW={'person':{k:o for k,_,o,_ in P},'ctx':{k:o for k,_,o,_ in C}}
MULTI={k:m for k,_,_,m in P if m}
def js():
    return 'const CD='+json.dumps({'P':[[k,l,o,m] for k,l,o,m in P],'C':[[k,l,o,m] for k,l,o,m in C],'T':T},ensure_ascii=False)+';'
def sql_allow():
    return json.dumps({'person':ALLOW['person'],'ctx':ALLOW['ctx'],'multi':MULTI,'text':{k:n for k,_,n in T}},ensure_ascii=False).replace("'","''")
if __name__=='__main__':
    import sys;print(js() if sys.argv[1]=='js' else sql_allow())
