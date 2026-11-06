/**
 * Route map geometry, taken from the approved Pakka build of the live site (its src/data/routeMap.ts,
 * compiled into index.html). Map units; `at` is how far along its line each stop sits (0 to 1), `len` the
 * line's length, both used to time the draw-in animation and the moving buses.
 */

/** viewBox of the map. y starts at 0 (the town buttons are positioned as a share of the height). */
export const MAP_FRAME = {x:-26,y:0,w:886,h:742};

export const mapStops = {LHR:{name:{en:"Lahore",ur:"لاہور"},x:762.8,y:365,kind:"terminal",side:"t",note:{en:"Lahore main terminal, 55 Lawrence Road. Every Lahore route starts here.",ur:"لاہور مین ٹرمینل، 55 لارنس روڈ۔ لاہور کے تمام روٹس یہیں سے شروع ہوتے ہیں۔"}},
  SGD:{cityId:"sargodha",name:{en:"Sargodha",ur:"سرگودھا"},x:435.5,y:243.1,kind:"terminal",side:"b"},
  KHJ:{cityId:"khushab-joharabad",name:{en:"Khushab–Joharabad",ur:"خوشاب جوہرآباد"},x:363,y:194.8,kind:"stop",side:"t"},
  QAD:{cityId:"qaidabad",name:{en:"Qaidabad",ur:"قائد آباد"},x:286.6,y:187.9,kind:"stop",side:"b"},
  MWL:{cityId:"mianwali",name:{en:"Mianwali",ur:"میانوالی"},x:212.1,y:128.1,kind:"counter-office",side:"r",note:{en:"Lahore and Multan routes meet here.",ur:"لاہور اور ملتان کے روٹس یہاں آ کر ملتے ہیں۔"}},
  CHB:{cityId:"chashma",name:{en:"Chashma Barrage",ur:"چشمہ بیراج"},x:182.7,y:162.6,kind:"office",side:"l"},
  DIK:{cityId:"di-khan",name:{en:"DI Khan",ur:"ڈیرہ اسماعیل خان"},x:88.6,y:300.6,kind:"terminal",side:"l"},
  KTC:{cityId:"kot-chandna",name:{en:"Kot Chandna",ur:"کوٹ چاندنہ"},x:216,y:98.2,kind:"stop",side:"r"},
  KMM:{cityId:"kamar-mushani",name:{en:"Kamar Mushani",ur:"کمر مشانی"},x:192.5,y:68.3,kind:"counter",side:"r"},
  ESK:{cityId:"esakhel",name:{en:"Esakhel",ur:"عیسیٰ خیل"},x:161.1,y:105.1,kind:"counter-office",side:"l"},
  MUL:{cityId:"multan",name:{en:"Multan",ur:"ملتان"},x:200.3,y:675.5,kind:"counter-office",side:"r",note:{en:"Start of the Multan to Esakhel route.",ur:"ملتان سے عیسیٰ خیل روٹ یہیں سے شروع ہوتا ہے۔"}},
  CHA:{cityId:"chowk-adam",name:{en:"Chowk Adam",ur:"چوک آدم"},x:149.4,y:498.4,kind:"stop",side:"l"},
  FTP:{cityId:"fateh-pur",name:{en:"Fateh Pur",ur:"فتح پور"},x:153.3,y:445.5,kind:"stop",side:"r"},
  SMJ:{cityId:"sarai-mahajar",name:{en:"Sarai Mahajar",ur:"سرائے مہاجر"},x:216,y:348.9,kind:"stop",side:"r"},
  BKR:{cityId:"bhakkar",name:{en:"Bhakkar",ur:"بھکر"},x:120,y:346.6,kind:"counter-office",side:"l"}};

const viaMianwali = {en:"via Sargodha and Mianwali",ur:"سرگودھا اور میانوالی کے راستے"};

export const mapRoutes = [{id:"route-1",ac:true,num:"1",color:"#e9b23a",via:viaMianwali,len:832,stops:["LHR","SGD","KHJ","QAD","MWL","CHB","DIK"],at:[0,.42,.53,.62,.74,.8,1],d:"M762.8,365.0 L751.3,364.3 Q742.0,363.6 733.2,360.4 L461.0,259.0 Q452.1,255.7 444.7,250.0 L443.0,248.8 Q435.5,243.1 426.5,240.4 L424.5,239.7 Q415.5,237.0 407.7,231.8 L384.1,216.1 Q376.3,210.9 370.3,203.6 L369.0,202.0 Q363.0,194.8 353.8,196.7 L351.7,197.1 Q342.5,199.0 333.2,198.1 L315.3,196.5 Q306.0,195.7 297.3,192.2 L295.3,191.4 Q286.6,187.9 277.9,184.4 L276.0,183.6 Q267.2,180.1 259.9,174.2 L231.3,151.2 Q223.9,145.3 218.6,137.6 L215.7,133.3 Q212.1,128.1 210.5,134.2 L210.1,135.6 Q208.4,141.7 204.3,146.5 L199.6,152.0 Q195.5,156.8 189.7,159.4 L188.5,160.0 Q182.7,162.6 180.8,168.6 L179.2,173.5 Q176.4,182.5 171.1,190.3 L110.1,279.7 Q104.8,287.5 97.5,293.4 L88.6,300.6"},
  {id:"route-2",ac:true,num:"2",color:"#3f9c8f",via:viaMianwali,len:742,stops:["LHR","SGD","KHJ","QAD","MWL","KTC","KMM","ESK"],at:[0,.47,.59,.7,.83,.88,.93,1],d:"M762.8,365.0 L753.6,358.1 Q746.2,352.4 737.3,349.1 L465.1,247.7 Q456.3,244.5 447.0,243.8 L444.9,243.7 Q435.5,243.1 429.5,235.9 L428.2,234.3 Q422.2,227.0 414.4,221.8 L390.8,206.1 Q383.0,200.9 374.0,198.2 L372.0,197.5 Q363.0,194.8 354.3,191.3 L352.3,190.5 Q343.6,187.0 334.3,186.2 L316.4,184.6 Q307.1,183.7 297.9,185.6 L295.8,186.0 Q286.6,187.9 281.3,180.2 L280.1,178.4 Q274.8,170.7 267.4,164.8 L238.8,141.8 Q231.5,135.9 222.7,132.4 L216.4,129.9 Q212.1,128.1 215.3,124.7 L216.0,123.9 Q219.1,120.5 219.7,115.9 L220.3,112.0 Q220.9,107.3 218.7,103.2 L218.2,102.3 Q216.0,98.2 215.3,93.6 L215.0,91.6 Q214.1,86.1 210.7,81.8 L207.2,77.3 Q203.8,73.0 198.7,70.9 L197.6,70.4 Q192.5,68.3 187.5,70.7 L185.2,71.8 Q179.1,74.7 174.8,79.8 L169.7,85.8 Q165.3,90.9 163.4,97.3 L161.1,105.1"},
  {id:"route-3",ac:true,num:"3",color:"#4a7fc1",via:{en:"direct, via Bhakkar",ur:"براہِ راست، بھکر کے راستے"},len:713,stops:["LHR","BKR","DIK"],at:[0,.92,1],d:"M762.8,365.0 L751.3,364.8 Q741.9,364.6 733.0,361.7 L574.5,310.9 Q559.3,306.0 543.4,307.2 L346.6,322.7 Q330.6,324.0 314.8,326.1 L149.9,348.6 Q140.6,349.8 131.3,348.4 L127.4,347.8 Q120.0,346.6 113.8,342.3 L112.4,341.4 Q106.3,337.1 102.0,330.9 L96.7,323.1 Q92.4,316.9 90.7,309.5 L88.6,300.6"},
  {id:"route-4",ac:true,num:"4",color:"#ef7f52",via:{en:"via Chowk Adam and Mianwali",ur:"چوک آدم اور میانوالی کے راستے"},len:707,stops:["MUL","CHA","FTP","SMJ","MWL","KTC","KMM","ESK"],at:[0,.26,.34,.51,.82,.87,.93,1],d:"M200.3,675.5 L194.1,665.8 Q189.0,657.9 186.4,648.9 L151.8,528.3 Q149.2,519.3 149.3,509.9 L149.3,505.6 Q149.4,498.4 147.2,491.5 L146.7,490.0 Q144.5,483.1 145.0,476.0 L145.7,467.1 Q146.2,459.9 149.4,453.4 L150.1,452.0 Q153.3,445.5 155.3,438.6 L156.5,434.5 Q159.2,425.5 164.3,417.6 L195.0,370.3 Q200.1,362.4 207.2,356.3 L208.8,355.0 Q216.0,348.9 213.1,339.9 L212.5,338.0 Q209.6,329.0 209.5,319.6 L206.6,157.6 Q206.5,148.2 209.0,139.2 L210.8,132.6 Q212.1,128.1 209.9,124.0 L209.4,123.1 Q207.2,119.0 207.8,114.3 L208.4,110.4 Q209.0,105.8 212.1,102.4 L212.8,101.6 Q216.0,98.2 211.7,96.4 L209.8,95.6 Q204.7,93.5 201.3,89.2 L197.8,84.7 Q194.4,80.4 193.5,74.9 L193.3,73.7 Q192.5,68.3 190.9,73.6 L190.2,76.1 Q188.3,82.5 183.9,87.6 L178.8,93.6 Q174.5,98.7 168.4,101.6 L161.1,105.1"}];

export const mapRivers = [{name:{en:"Indus",ur:"دریائے سندھ"},label:{x:36,y:560,rotate:-80},d:"M229.7,20.0 L212.1,43.0 L196.4,118.9 L178.8,164.9 L137.6,227.0 L98.4,296.0 L84.7,388.0 L80.8,491.5 L88.6,583.5 L118.0,710.0"},
  {name:{en:"Jhelum",ur:"جہلم"},label:{x:520,y:124,rotate:-30},d:"M647.2,20.0 L578.6,89.0 L490.4,146.5 L382.6,204.0 L333.6,296.0 L333.6,388.0 L339.5,445.5"},
  {name:{en:"Chenab",ur:"چناب"},label:{x:606,y:170,rotate:-48},d:"M745.2,20.0 L666.8,112.0 L588.4,204.0 L500.2,296.0 L412.0,388.0 L339.5,445.5 L274.8,549.0 L216.0,641.0 L167.0,710.0"},
  {name:{en:"Ravi",ur:"راوی"},label:{x:624,y:482,rotate:-30},d:"M843.2,181.0 L774.6,319.0 L706.0,422.5 L598.2,491.5 L480.6,549.0 L363.0,583.5 L284.6,618.0"}];
