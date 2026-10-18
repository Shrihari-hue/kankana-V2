#!/bin/bash
# Downloads the free-license Unsplash photography used by the site.
cd "$(dirname "$0")/assets/img" || exit 1
mkdir -p t
get(){ # name id width  (+ a 640px thumbnail in t/ for small tiles)
  [ -s "$1.jpg" ] || curl -s -L -m 40 -o "$1.jpg" "https://images.unsplash.com/photo-$2?w=$3&q=72&auto=format&fm=jpg&fit=max"
  [ -s "t/$1.jpg" ] || curl -s -L -m 40 -o "t/$1.jpg" "https://images.unsplash.com/photo-$2?w=640&q=66&auto=format&fm=jpg&fit=max"
  echo "ok $1"; }
# full-bleed
get hero        1506905925346-21bda4d32df4 2200
get valley      1500534314209-a25ddb2bd429 2200
get mistforest  1418065460487-3e41a6c84dc5 2000
get greenvalley 1470071459604-3b5ec3a7fe05 2000
get house       1600585154340-be6161a56a0c 2000
get living      1600210491892-03d54c0aaf87 2000
get bedlake     1596394516093-501ba68a0ba6 2000
get nightpool   1542314831-068cd1dbfeeb    2000
get stars       1519681393784-d120267933ba 2200
get darkpeaks   1477346611705-65d1883cee1e 2200
get waterfall   1517760444937-f6397edcbbcd 1800
get falls2      1432405972618-c60b0225b8f9 1600
get cabinnight  1510798831971-661eb04b3739 2000
get infinity    1543489822-c49534f3271f    1800
get dusk        1571896349842-33c89424de2d 1800
get glass       1600573472550-8090b5e0745e 1800
get lounge      1600607687939-ce8a6c25118c 1600
get living2     1618221195710-dd6b41faaea6 1600
get bedforest   1582719478250-c89cae4dc85b 1600
get bedwarm     1611892440504-42a792e24d32 1600
get bath        1620626011761-996317b8d101 1400
get bath2       1584622650111-993a426fbf0a 1400
get dining      1414235077428-338989a2e8c0 1400
get bar         1517248135467-4c7edcad34c4 1400
get coffee      1509042239860-f550ce710b93 1200
get hiker       1551632811-561732d1e306    1400
get spa         1544161515-4ab6ce6db874    1200
get spa2        1540555700478-4be289fbecef 1200
get roundwin    1602002418082-a4443e081dd1 1400
get deck        1584132967334-10e028bd69f7 1400
get house2      1600566753190-17f0baa2a6c3 1600
get house3      1600047509807-ba8f99d2cdde 1600
get lakecabin   1470770841072-f978cf4d019e 1600
get pier        1508672019048-805c876b67e2 1600
get sunsetvly   1472214103451-9374bd1c798e 1600
get forestpath  1447752875215-b2761acb3c5d 1400
get tent        1504280390367-361c6d9f38f4 1400
get peaks2      1464822759023-fed622ff2c3b 1600
get boat        1476514525535-07fb3b4ae5f1 1600
get milky       1468276311594-df7cb65d8df6 1600
# --- venue & resort set ---
get resort      1520250497591-112f2f40a3f4 2200
get terraces    1559628233-100c798642d4    2200
get aisle       1469371670807-013ccf25f16a 2000
get couplepalms 1606216794074-735e91aa2c92 1800
get confetti    1583939003579-730e3918a45a 1800
get ballroom    1587271407850-8d438ca9fdf2 1800
get reception   1519225421980-715cb0215aed 1600
get tentdinner  1464366400600-7168b8af9bc3 1600
get gardenarch  1523438885200-e635ba2c371e 2000
get toast       1527529482837-4698179dc6ce 1800
get dj          1470225620780-dba8ba36b745 1600
get balloons    1530103862676-de8c9debad1d 1400
get cake        1464349095431-e9a21285b5f3 1400
get holi        1496024840928-4c417adf211d 1600
get conference  1540575467063-178a50c2df87 1800
get presenting  1505373877841-8d25f7d46678 1600
get stage       1503095396549-807759245b35 1800
get amphi       1459749411175-04bf5292ceea 2200
get cafe        1554118811-1e0d58224f24    1800
get cafewindow  1445116572660-236099ec97a0 1800
get turf        1574629810360-7efbbe195018 1800
get turfnight   1431324155629-1a6deb1dec8d 2000
get pickleball  1686721135030-e2ab79e27b16 1600
get pooldeck    1582719508461-905c673771fd 1600
get balivilla   1566073771259-6a8506099945 1800
get palmpool    1610641818989-c2051b5e2cfd 1800
get balcony     1615880484746-a134be9a6ecf 1800
get poolpalms   1596436889106-be35e843f974 1800
get poolsunset  1600011689032-8b628b8a8747 2200
get banquet     1519167758481-83f550bb49b3 1600
get rosegate  1524228529766-4d7fe5dc55ca 2000   # Rose Gate, City Palace, Jaipur (intro doors)
# assets/img/diya.png: cut out from Unsplash photo-1636266513371-acdf50931253 (free licence)
# assets/img/petals/*.png: cut out from Unsplash photos-1612185290152-5c5862fcc167 and 1786918450845-d12825dbd354 (free licence)
