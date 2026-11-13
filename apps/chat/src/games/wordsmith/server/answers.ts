// Play order: the word for day N is ANSWERS[N % length]. Append only; reordering or removing changes past and current days.
const ANSWERS_TEXT = `
owner flash brand bring shape sugar empty apply arise thief fever class
watch drink sleep again plumb offer naive onion album entry nurse relay
stone train theme paper alter blend whale liver ought young align swamp
scene plate music vague amuse breed flute write heart stamp false pinch
truck foggy wrong notch often fable fancy agent cable sharp roast bacon
motor canoe worry chess earth scrap early squad shore pupil query scarf
other delay fresh layer movie upper aroma ridge glass speed medal mango
grill shrug draft metal stove broad hinge enter rugby crane quirk choir
pluck panel drill paint clown touch ruler bagel voice honey puppy sauce
vocal lunar learn sound alarm clock allow broom spear topic ranch pulse
money space daily piano cream built pilot serve jolly swear month guide
magic mirth globe value climb asset share glory ivory fleet think penny
angry video taste viola stack pride orbit aware quest shark crowd spark
trial robin upset round trace grind great clerk valid zebra fifth trail
shelf giant awake hurry plane woven birth chill reply greed steak rocky
floor flame comet adopt sheep steam treat human chord level skate dough
twist grant honor width melon eager basin skirt moral trick award label
image peace quota brown stage rifle coach gleam rough queen forth drama
under eight trend amber river token range teach apron cheap plant judge
curve staff easel mouth three table outer sense third witty blast bunch
trade worth about admit glare beard power piece crawl ocean boast guard
yeast dress scoop ahead style enjoy slope candy scout baker silly smart
cliff fudge solar carry proud moist oxide south beach toxic being bland
blade cabin delta lucky ounce haunt tower knife heavy horse maple cheek
trust awful shirt ideal found plank laser drawn woman cheer slice spine
clean vapor bless ghost board chief lunch prune mayor olive slide storm
audit skull forge drift laugh agree thing crash thank gauge click tiger
group chair realm every broke feast sweat pound humor crown react eagle
diary minor swift plead salon price event sword bonus state essay unite
close weary error speak mercy print fetch mount cycle quote knack doubt
dense blank wagon otter haste royal comic court wheel rhyme argue grand
spray hedge toast green graph index color bound brick waist jelly sunny
frost juice purse stuff brief dealt rally build perch polar total gloom
cause reach shake start noise prime float chase bloom dodge plume creek
straw plain bread fence yield jumbo charm shell berry arrow whole porch
smile alone stand black basic throw union house inner stool swing vinyl
snake ready jewel uncle raven crust rural armor blown block decay slate
frame final chain spare match aside dream track clamp brook cocoa sting
place world later arena valve today shade coral faith shout verse groan
forty snack forum crumb actor shock seven sight rapid grass grace solid
major joint clash avoid alien chest smoke night adapt fruit route depth
dance wheat short solve spoon trunk catch study guess ankle fairy opera
quiet punch point timer greet vault belly claim hover panic exist prize
exact sneak truly faint drain chart order story since mouse rival thumb
patch pearl grove hello quilt usual extra grain ferry funny north youth
donut thorn grasp inbox pause noble sweet stock pouch march white novel
spell anger count drive still hound tribe grape flood fiery bride suite
vital front rigid logic kayak blind cover buddy couch civic cargo scent
cloth sweep audio brisk salad grade child field dried pizza glide blame
scale smell dairy angel chalk angle along badge alive blink after whirl
brain party shift batch burst tough loose crazy wrist stair booth clear
water beast towel alert growl moose vigor adult fight radio flesh robot
limit camel press harsh spike elder cloud issue model chunk thick happy
pedal begin torch while fifty tulip equal nerve weave shine check score
organ elbow lemon dizzy lodge flour brake craft lilac yacht right force
coast probe unify merit peach tutor light shame strip focus break truth
cider given above sport urban boost steel pasta waste crisp scope skill
brush habit radar super wound knock unity spend fuzzy wedge brave flock
blaze guest glove input stake hobby spice relax grief fluid linen steep
never plaza quick hotel bench vivid apple plaid stick daisy
`;

export const ANSWERS: readonly string[] =
  ANSWERS_TEXT.split(/\s+/).filter(Boolean);
