import sys
src=open('build4.js').read()
a=src.index("  const CI = ['key'"); b=src.index("  // =============================================================== 3. WHATSAPP A (Marzia)")
for n in sys.argv[1:]:
    s=src[:a]+open(f'intro{n}.js').read()+src[b:]
    R=[("user2: fa.FaUser };","user2: fa.FaUser, raise: fa.FaHandPaper, trophy: fa.FaTrophy, door: fa.FaDoorOpen };"),
       ("just like the NBR chairman's account, asking for money","as happened to the chairman of the National Board of Revenue in September 2025, asking for money"),
       ("But in every story today, from the NBR chairman to the actor, the lock was not broken.","But in every real case we showed today, the lock was not broken.")]
    for x,y in R:
        assert x in s, x; s=s.replace(x,y)
    open(f'build{n}.js','w').write(s)
