export type SystemId = 'skeleton' | 'muscles';
export type SystemPart = {id:string;name:string;sourceId:string;kind:'bone'|'cartilage'|'disc'|'muscle'};
export const systemParts:Record<SystemId,SystemPart[]> = {
  "skeleton": [
    {
      "id": "FJ3152",
      "name": "Right hip bone",
      "sourceId": "FMA16586",
      "kind": "bone"
    },
    {
      "id": "FJ3153",
      "name": "Xiphoid process",
      "sourceId": "FMA7488",
      "kind": "bone"
    },
    {
      "id": "FJ3154",
      "name": "Tenth thoracic vertebra",
      "sourceId": "FMA10037",
      "kind": "bone"
    },
    {
      "id": "FJ3155",
      "name": "Eleventh thoracic vertebra",
      "sourceId": "FMA10059",
      "kind": "bone"
    },
    {
      "id": "FJ3156",
      "name": "Twelfth thoracic vertebra",
      "sourceId": "FMA10081",
      "kind": "bone"
    },
    {
      "id": "FJ3157",
      "name": "First lumbar vertebra",
      "sourceId": "FMA13072",
      "kind": "bone"
    },
    {
      "id": "FJ3158",
      "name": "First thoracic vertebra",
      "sourceId": "FMA9165",
      "kind": "bone"
    },
    {
      "id": "FJ3159",
      "name": "Second lumbar vertebra",
      "sourceId": "FMA13073",
      "kind": "bone"
    },
    {
      "id": "FJ3160",
      "name": "Second thoracic vertebra",
      "sourceId": "FMA9187",
      "kind": "bone"
    },
    {
      "id": "FJ3161",
      "name": "Third cervical vertebra",
      "sourceId": "FMA12521",
      "kind": "bone"
    },
    {
      "id": "FJ3162",
      "name": "Third lumbar vertebra",
      "sourceId": "FMA13074",
      "kind": "bone"
    },
    {
      "id": "FJ3163",
      "name": "Third thoracic vertebra",
      "sourceId": "FMA9209",
      "kind": "bone"
    },
    {
      "id": "FJ3164",
      "name": "Fourth cervical vertebra",
      "sourceId": "FMA12522",
      "kind": "bone"
    },
    {
      "id": "FJ3165",
      "name": "Fourth lumbar vertebra",
      "sourceId": "FMA13075",
      "kind": "bone"
    },
    {
      "id": "FJ3166",
      "name": "Fourth thoracic vertebra",
      "sourceId": "FMA9248",
      "kind": "bone"
    },
    {
      "id": "FJ3167",
      "name": "Fifth cervical vertebra",
      "sourceId": "FMA12523",
      "kind": "bone"
    },
    {
      "id": "FJ3168",
      "name": "Fifth lumbar vertebra",
      "sourceId": "FMA13076",
      "kind": "bone"
    },
    {
      "id": "FJ3169",
      "name": "Fifth thoracic vertebra",
      "sourceId": "FMA9922",
      "kind": "bone"
    },
    {
      "id": "FJ3170",
      "name": "Sixth cervical vertebra",
      "sourceId": "FMA12524",
      "kind": "bone"
    },
    {
      "id": "FJ3171",
      "name": "Sixth thoracic vertebra",
      "sourceId": "FMA9945",
      "kind": "bone"
    },
    {
      "id": "FJ3172",
      "name": "Seventh cervical vertebra",
      "sourceId": "FMA12525",
      "kind": "bone"
    },
    {
      "id": "FJ3173",
      "name": "Seventh thoracic vertebra",
      "sourceId": "FMA9968",
      "kind": "bone"
    },
    {
      "id": "FJ3174",
      "name": "Eighth thoracic vertebra",
      "sourceId": "FMA9991",
      "kind": "bone"
    },
    {
      "id": "FJ3175",
      "name": "Ninth thoracic vertebra",
      "sourceId": "FMA10014",
      "kind": "bone"
    },
    {
      "id": "FJ3176",
      "name": "Atlas",
      "sourceId": "FMA12519",
      "kind": "bone"
    },
    {
      "id": "FJ3177",
      "name": "Axis",
      "sourceId": "FMA12520",
      "kind": "bone"
    },
    {
      "id": "FJ3178",
      "name": "Body of sternum",
      "sourceId": "FMA7487",
      "kind": "bone"
    },
    {
      "id": "FJ3179",
      "name": "Distal phalanx of left second toe",
      "sourceId": "FMA32653",
      "kind": "bone"
    },
    {
      "id": "FJ3180",
      "name": "Distal phalanx of left third toe",
      "sourceId": "FMA32655",
      "kind": "bone"
    },
    {
      "id": "FJ3181",
      "name": "Distal phalanx of left fourth toe",
      "sourceId": "FMA32657",
      "kind": "bone"
    },
    {
      "id": "FJ3182",
      "name": "Distal phalanx of left big toe",
      "sourceId": "FMA32651",
      "kind": "bone"
    },
    {
      "id": "FJ3183",
      "name": "Distal phalanx of left index finger",
      "sourceId": "FMA23953",
      "kind": "bone"
    },
    {
      "id": "FJ3184",
      "name": "Distal phalanx of left little finger",
      "sourceId": "FMA23959",
      "kind": "bone"
    },
    {
      "id": "FJ3185",
      "name": "Distal phalanx of left little toe",
      "sourceId": "FMA32659",
      "kind": "bone"
    },
    {
      "id": "FJ3186",
      "name": "Distal phalanx of left middle finger",
      "sourceId": "FMA23955",
      "kind": "bone"
    },
    {
      "id": "FJ3187",
      "name": "Distal phalanx of left ring finger",
      "sourceId": "FMA23957",
      "kind": "bone"
    },
    {
      "id": "FJ3188",
      "name": "Distal phalanx of left thumb",
      "sourceId": "FMA23951",
      "kind": "bone"
    },
    {
      "id": "FJ3189",
      "name": "Distal phalanx of right second toe",
      "sourceId": "FMA32652",
      "kind": "bone"
    },
    {
      "id": "FJ3190",
      "name": "Distal phalanx of right third toe",
      "sourceId": "FMA32654",
      "kind": "bone"
    },
    {
      "id": "FJ3191",
      "name": "Distal phalanx of right fourth toe",
      "sourceId": "FMA32656",
      "kind": "bone"
    },
    {
      "id": "FJ3192",
      "name": "Distal phalanx of right big toe",
      "sourceId": "FMA32650",
      "kind": "bone"
    },
    {
      "id": "FJ3193",
      "name": "Distal phalanx of right index finger",
      "sourceId": "FMA24460",
      "kind": "bone"
    },
    {
      "id": "FJ3194",
      "name": "Distal phalanx of right little finger",
      "sourceId": "FMA24463",
      "kind": "bone"
    },
    {
      "id": "FJ3195",
      "name": "Distal phalanx of right little toe",
      "sourceId": "FMA32658",
      "kind": "bone"
    },
    {
      "id": "FJ3196",
      "name": "Distal phalanx of right middle finger",
      "sourceId": "FMA24461",
      "kind": "bone"
    },
    {
      "id": "FJ3197",
      "name": "Distal phalanx of right ring finger",
      "sourceId": "FMA24462",
      "kind": "bone"
    },
    {
      "id": "FJ3198",
      "name": "Distal phalanx of right thumb",
      "sourceId": "FMA24459",
      "kind": "bone"
    },
    {
      "id": "FJ3199",
      "name": "Ethmoid",
      "sourceId": "FMA52740",
      "kind": "bone"
    },
    {
      "id": "FJ3200",
      "name": "Frontal bone",
      "sourceId": "FMA52734",
      "kind": "bone"
    },
    {
      "id": "FJ3201",
      "name": "Hyoid bone",
      "sourceId": "FMA52749",
      "kind": "bone"
    },
    {
      "id": "FJ3202",
      "name": "Intervertebral disk of axis",
      "sourceId": "FMA25058",
      "kind": "disc"
    },
    {
      "id": "FJ3203",
      "name": "Intervertebral disk of fourth thoracic vertebra",
      "sourceId": "FMA13501",
      "kind": "disc"
    },
    {
      "id": "FJ3204",
      "name": "Intervertebral disk of fifth thoracic vertebra",
      "sourceId": "FMA13502",
      "kind": "disc"
    },
    {
      "id": "FJ3205",
      "name": "Intervertebral disk of sixth thoracic vertebra",
      "sourceId": "FMA13503",
      "kind": "disc"
    },
    {
      "id": "FJ3206",
      "name": "Intervertebral disk of seventh thoracic vertebra",
      "sourceId": "FMA13504",
      "kind": "disc"
    },
    {
      "id": "FJ3207",
      "name": "Intervertebral disk of eighth thoracic vertebra",
      "sourceId": "FMA13505",
      "kind": "disc"
    },
    {
      "id": "FJ3208",
      "name": "Intervertebral disk of ninth thoracic vertebra",
      "sourceId": "FMA13506",
      "kind": "disc"
    },
    {
      "id": "FJ3209",
      "name": "Intervertebral disk of tenth thoracic vertebra",
      "sourceId": "FMA13507",
      "kind": "disc"
    },
    {
      "id": "FJ3210",
      "name": "Intervertebral disk of eleventh thoracic vertebra",
      "sourceId": "FMA13508",
      "kind": "disc"
    },
    {
      "id": "FJ3211",
      "name": "Intervertebral disk",
      "sourceId": "FMA10446",
      "kind": "disc"
    },
    {
      "id": "FJ3212",
      "name": "Intervertebral disk of first lumbar vertebra",
      "sourceId": "FMA16033",
      "kind": "disc"
    },
    {
      "id": "FJ3213",
      "name": "Intervertebral disk of third cervical vertebra",
      "sourceId": "FMA13896",
      "kind": "disc"
    },
    {
      "id": "FJ3214",
      "name": "Intervertebral disk of second lumbar vertebra",
      "sourceId": "FMA16034",
      "kind": "disc"
    },
    {
      "id": "FJ3215",
      "name": "Intervertebral disk of third lumbar vertebra",
      "sourceId": "FMA16035",
      "kind": "disc"
    },
    {
      "id": "FJ3216",
      "name": "Intervertebral disk of fourth lumbar vertebra",
      "sourceId": "FMA16036",
      "kind": "disc"
    },
    {
      "id": "FJ3217",
      "name": "Intervertebral disk of fifth lumbar vertebra",
      "sourceId": "FMA16037",
      "kind": "disc"
    },
    {
      "id": "FJ3218",
      "name": "Intervertebral disk of fourth cervical vertebra",
      "sourceId": "FMA13897",
      "kind": "disc"
    },
    {
      "id": "FJ3219",
      "name": "Intervertebral disk of fifth cervical vertebra",
      "sourceId": "FMA13898",
      "kind": "disc"
    },
    {
      "id": "FJ3220",
      "name": "Intervertebral disk of sixth cervical vertebra",
      "sourceId": "FMA13899",
      "kind": "disc"
    },
    {
      "id": "FJ3221",
      "name": "Intervertebral disk of seventh cervical vertebra",
      "sourceId": "FMA13900",
      "kind": "disc"
    },
    {
      "id": "FJ3222",
      "name": "Intervertebral disk of first thoracic vertebra",
      "sourceId": "FMA10458",
      "kind": "disc"
    },
    {
      "id": "FJ3223",
      "name": "Intervertebral disk of second thoracic vertebra",
      "sourceId": "FMA13495",
      "kind": "disc"
    },
    {
      "id": "FJ3224",
      "name": "Intervertebral disk of third thoracic vertebra",
      "sourceId": "FMA13500",
      "kind": "disc"
    },
    {
      "id": "FJ3225",
      "name": "Left tenth rib",
      "sourceId": "FMA8472",
      "kind": "bone"
    },
    {
      "id": "FJ3226",
      "name": "Left eleventh rib",
      "sourceId": "FMA8532",
      "kind": "bone"
    },
    {
      "id": "FJ3227",
      "name": "Left twelfth rib",
      "sourceId": "FMA8534",
      "kind": "bone"
    },
    {
      "id": "FJ3228",
      "name": "Left first rib",
      "sourceId": "FMA7987",
      "kind": "bone"
    },
    {
      "id": "FJ3229",
      "name": "Left second rib",
      "sourceId": "FMA8012",
      "kind": "bone"
    },
    {
      "id": "FJ3230",
      "name": "Left third rib",
      "sourceId": "FMA8039",
      "kind": "bone"
    },
    {
      "id": "FJ3231",
      "name": "Left fourth rib",
      "sourceId": "FMA8148",
      "kind": "bone"
    },
    {
      "id": "FJ3232",
      "name": "Left fifth rib",
      "sourceId": "FMA8093",
      "kind": "bone"
    },
    {
      "id": "FJ3233",
      "name": "Left sixth rib",
      "sourceId": "FMA8202",
      "kind": "bone"
    },
    {
      "id": "FJ3234",
      "name": "Left seventh rib",
      "sourceId": "FMA8256",
      "kind": "bone"
    },
    {
      "id": "FJ3235",
      "name": "Left eighth rib",
      "sourceId": "FMA8310",
      "kind": "bone"
    },
    {
      "id": "FJ3236",
      "name": "Left ninth rib",
      "sourceId": "FMA8391",
      "kind": "bone"
    },
    {
      "id": "FJ3237",
      "name": "Left clavicle",
      "sourceId": "FMA13323",
      "kind": "bone"
    },
    {
      "id": "FJ3239",
      "name": "Left first costal cartilage",
      "sourceId": "FMA8005",
      "kind": "cartilage"
    },
    {
      "id": "FJ3240",
      "name": "Left first metacarpal bone",
      "sourceId": "FMA24465",
      "kind": "bone"
    },
    {
      "id": "FJ3241",
      "name": "Left first metatarsal bone",
      "sourceId": "FMA24508",
      "kind": "bone"
    },
    {
      "id": "FJ3242",
      "name": "Left second costal cartilage",
      "sourceId": "FMA8031",
      "kind": "cartilage"
    },
    {
      "id": "FJ3243",
      "name": "Left second metacarpal bone",
      "sourceId": "FMA24467",
      "kind": "bone"
    },
    {
      "id": "FJ3244",
      "name": "Left second metatarsal bone",
      "sourceId": "FMA24510",
      "kind": "bone"
    },
    {
      "id": "FJ3245",
      "name": "Left third costal cartilage",
      "sourceId": "FMA8058",
      "kind": "cartilage"
    },
    {
      "id": "FJ3246",
      "name": "Left third metacarpal bone",
      "sourceId": "FMA24469",
      "kind": "bone"
    },
    {
      "id": "FJ3247",
      "name": "Left third metatarsal bone",
      "sourceId": "FMA24512",
      "kind": "bone"
    },
    {
      "id": "FJ3248",
      "name": "Left fourth costal cartilage",
      "sourceId": "FMA8167",
      "kind": "cartilage"
    },
    {
      "id": "FJ3249",
      "name": "Left fourth metacarpal bone",
      "sourceId": "FMA24471",
      "kind": "bone"
    },
    {
      "id": "FJ3250",
      "name": "Left fourth metatarsal bone",
      "sourceId": "FMA24514",
      "kind": "bone"
    },
    {
      "id": "FJ3251",
      "name": "Left fifth costal cartilage",
      "sourceId": "FMA8112",
      "kind": "cartilage"
    },
    {
      "id": "FJ3252",
      "name": "Left fifth metacarpal bone",
      "sourceId": "FMA24473",
      "kind": "bone"
    },
    {
      "id": "FJ3253",
      "name": "Left fifth metatarsal bone",
      "sourceId": "FMA24516",
      "kind": "bone"
    },
    {
      "id": "FJ3254",
      "name": "Left sixth costal cartilage",
      "sourceId": "FMA8221",
      "kind": "cartilage"
    },
    {
      "id": "FJ3255",
      "name": "Left seventh costal cartilage",
      "sourceId": "FMA8275",
      "kind": "cartilage"
    },
    {
      "id": "FJ3256",
      "name": "Left calcaneus",
      "sourceId": "FMA24498",
      "kind": "bone"
    },
    {
      "id": "FJ3257",
      "name": "Left capitate",
      "sourceId": "FMA24447",
      "kind": "bone"
    },
    {
      "id": "FJ3258",
      "name": "Left cuboid bone",
      "sourceId": "FMA24529",
      "kind": "bone"
    },
    {
      "id": "FJ3259",
      "name": "Left femur",
      "sourceId": "FMA24475",
      "kind": "bone"
    },
    {
      "id": "FJ3260",
      "name": "Left fibula",
      "sourceId": "FMA24481",
      "kind": "bone"
    },
    {
      "id": "FJ3261",
      "name": "Left hamate",
      "sourceId": "FMA24449",
      "kind": "bone"
    },
    {
      "id": "FJ3262",
      "name": "Left humerus",
      "sourceId": "FMA23131",
      "kind": "bone"
    },
    {
      "id": "FJ3263",
      "name": "Left inferior nasal concha",
      "sourceId": "FMA54738",
      "kind": "bone"
    },
    {
      "id": "FJ3264",
      "name": "Left intermediate cuneiform bone",
      "sourceId": "FMA24524",
      "kind": "bone"
    },
    {
      "id": "FJ3265",
      "name": "Left lacrimal bone",
      "sourceId": "FMA53646",
      "kind": "bone"
    },
    {
      "id": "FJ3267",
      "name": "Left lateral cuneiform bone",
      "sourceId": "FMA24526",
      "kind": "bone"
    },
    {
      "id": "FJ3268",
      "name": "Left lunate",
      "sourceId": "FMA24438",
      "kind": "bone"
    },
    {
      "id": "FJ3269",
      "name": "Left maxilla",
      "sourceId": "FMA53650",
      "kind": "bone"
    },
    {
      "id": "FJ3271",
      "name": "Left medial cuneiform bone",
      "sourceId": "FMA24522",
      "kind": "bone"
    },
    {
      "id": "FJ3272",
      "name": "Left nasal bone",
      "sourceId": "FMA53648",
      "kind": "bone"
    },
    {
      "id": "FJ3273",
      "name": "Left palatine bone",
      "sourceId": "FMA53656",
      "kind": "bone"
    },
    {
      "id": "FJ3274",
      "name": "Left parietal bone",
      "sourceId": "FMA52789",
      "kind": "bone"
    },
    {
      "id": "FJ3275",
      "name": "Left patella",
      "sourceId": "FMA24487",
      "kind": "bone"
    },
    {
      "id": "FJ3276",
      "name": "Left pisiform",
      "sourceId": "FMA24442",
      "kind": "bone"
    },
    {
      "id": "FJ3277",
      "name": "Left radius",
      "sourceId": "FMA23465",
      "kind": "bone"
    },
    {
      "id": "FJ3278",
      "name": "Left scaphoid",
      "sourceId": "FMA24436",
      "kind": "bone"
    },
    {
      "id": "FJ3279",
      "name": "Left scapula",
      "sourceId": "FMA13396",
      "kind": "bone"
    },
    {
      "id": "FJ3280",
      "name": "Left talus",
      "sourceId": "FMA24483",
      "kind": "bone"
    },
    {
      "id": "FJ3281",
      "name": "Left temporal bone",
      "sourceId": "FMA52739",
      "kind": "bone"
    },
    {
      "id": "FJ3282",
      "name": "Left tibia",
      "sourceId": "FMA24478",
      "kind": "bone"
    },
    {
      "id": "FJ3283",
      "name": "Left trapezium",
      "sourceId": "FMA24444",
      "kind": "bone"
    },
    {
      "id": "FJ3284",
      "name": "Left trapezoid",
      "sourceId": "FMA24445",
      "kind": "bone"
    },
    {
      "id": "FJ3285",
      "name": "Left triquetral",
      "sourceId": "FMA24440",
      "kind": "bone"
    },
    {
      "id": "FJ3286",
      "name": "Left ulna",
      "sourceId": "FMA23468",
      "kind": "bone"
    },
    {
      "id": "FJ3287",
      "name": "Left zygomatic bone",
      "sourceId": "FMA52893",
      "kind": "bone"
    },
    {
      "id": "FJ3288",
      "name": "Left hip bone",
      "sourceId": "FMA16587",
      "kind": "bone"
    },
    {
      "id": "FJ3289",
      "name": "Mandible",
      "sourceId": "FMA52748",
      "kind": "bone"
    },
    {
      "id": "FJ3290",
      "name": "Manubrium",
      "sourceId": "FMA7486",
      "kind": "bone"
    },
    {
      "id": "FJ3291",
      "name": "Middle phalanx of left ring finger",
      "sourceId": "FMA23942",
      "kind": "bone"
    },
    {
      "id": "FJ3292",
      "name": "Middle phalanx of right ring finger",
      "sourceId": "FMA24457",
      "kind": "bone"
    },
    {
      "id": "FJ3293",
      "name": "Middle phalanx of left second toe",
      "sourceId": "FMA32643",
      "kind": "bone"
    },
    {
      "id": "FJ3294",
      "name": "Middle phalanx of left third toe",
      "sourceId": "FMA32645",
      "kind": "bone"
    },
    {
      "id": "FJ3295",
      "name": "Middle phalanx of left fourth toe",
      "sourceId": "FMA32647",
      "kind": "bone"
    },
    {
      "id": "FJ3296",
      "name": "Middle phalanx of left index finger",
      "sourceId": "FMA23938",
      "kind": "bone"
    },
    {
      "id": "FJ3297",
      "name": "Middle phalanx of left little finger",
      "sourceId": "FMA23944",
      "kind": "bone"
    },
    {
      "id": "FJ3298",
      "name": "Middle phalanx of left little toe",
      "sourceId": "FMA230988",
      "kind": "bone"
    },
    {
      "id": "FJ3299",
      "name": "Middle phalanx of left middle finger",
      "sourceId": "FMA23940",
      "kind": "bone"
    },
    {
      "id": "FJ3300",
      "name": "Middle phalanx of right second toe",
      "sourceId": "FMA32642",
      "kind": "bone"
    },
    {
      "id": "FJ3301",
      "name": "Middle phalanx of right third toe",
      "sourceId": "FMA32644",
      "kind": "bone"
    },
    {
      "id": "FJ3302",
      "name": "Middle phalanx of right fourth toe",
      "sourceId": "FMA32646",
      "kind": "bone"
    },
    {
      "id": "FJ3303",
      "name": "Middle phalanx of right index finger",
      "sourceId": "FMA24455",
      "kind": "bone"
    },
    {
      "id": "FJ3304",
      "name": "Middle phalanx of right little finger",
      "sourceId": "FMA24458",
      "kind": "bone"
    },
    {
      "id": "FJ3305",
      "name": "Middle phalanx of right little toe",
      "sourceId": "FMA230986",
      "kind": "bone"
    },
    {
      "id": "FJ3306",
      "name": "Middle phalanx of right middle finger",
      "sourceId": "FMA24456",
      "kind": "bone"
    },
    {
      "id": "FJ3307",
      "name": "Navicular bone of left foot",
      "sourceId": "FMA24501",
      "kind": "bone"
    },
    {
      "id": "FJ3308",
      "name": "Navicular bone of right foot",
      "sourceId": "FMA24500",
      "kind": "bone"
    },
    {
      "id": "FJ3309",
      "name": "Occipital bone",
      "sourceId": "FMA52735",
      "kind": "bone"
    },
    {
      "id": "FJ3310",
      "name": "Proximal phalanx of right big toe",
      "sourceId": "FMA43253",
      "kind": "bone"
    },
    {
      "id": "FJ3311",
      "name": "Proximal phalanx of left third toe",
      "sourceId": "FMA32637",
      "kind": "bone"
    },
    {
      "id": "FJ3312",
      "name": "Proximal phalanx of left fourth toe",
      "sourceId": "FMA32639",
      "kind": "bone"
    },
    {
      "id": "FJ3313",
      "name": "Proximal phalanx of left index finger",
      "sourceId": "FMA71915",
      "kind": "bone"
    },
    {
      "id": "FJ3314",
      "name": "Proximal phalanx of left little finger",
      "sourceId": "FMA66791",
      "kind": "bone"
    },
    {
      "id": "FJ3315",
      "name": "Proximal phalanx of left little toe",
      "sourceId": "FMA32641",
      "kind": "bone"
    },
    {
      "id": "FJ3316",
      "name": "Proximal phalanx of left middle finger",
      "sourceId": "FMA71908",
      "kind": "bone"
    },
    {
      "id": "FJ3317",
      "name": "Proximal phalanx of left ring finger",
      "sourceId": "FMA71916",
      "kind": "bone"
    },
    {
      "id": "FJ3318",
      "name": "Proximal phalanx of left thumb",
      "sourceId": "FMA65470",
      "kind": "bone"
    },
    {
      "id": "FJ3319",
      "name": "Proximal phalanx of right second toe",
      "sourceId": "FMA32634",
      "kind": "bone"
    },
    {
      "id": "FJ3320",
      "name": "Proximal phalanx of right third toe",
      "sourceId": "FMA32636",
      "kind": "bone"
    },
    {
      "id": "FJ3321",
      "name": "Proximal phalanx of right fourth toe",
      "sourceId": "FMA32638",
      "kind": "bone"
    },
    {
      "id": "FJ3322",
      "name": "Proximal phalanx of right index finger",
      "sourceId": "FMA24451",
      "kind": "bone"
    },
    {
      "id": "FJ3323",
      "name": "Proximal phalanx of right little finger",
      "sourceId": "FMA24454",
      "kind": "bone"
    },
    {
      "id": "FJ3324",
      "name": "Proximal phalanx of right little toe",
      "sourceId": "FMA32640",
      "kind": "bone"
    },
    {
      "id": "FJ3325",
      "name": "Proximal phalanx of right middle finger",
      "sourceId": "FMA24452",
      "kind": "bone"
    },
    {
      "id": "FJ3326",
      "name": "Proximal phalanx of right ring finger",
      "sourceId": "FMA24453",
      "kind": "bone"
    },
    {
      "id": "FJ3327",
      "name": "Proximal phalanx of right thumb",
      "sourceId": "FMA24450",
      "kind": "bone"
    },
    {
      "id": "FJ3328",
      "name": "Proximal phalanx of left second toe",
      "sourceId": "FMA32635",
      "kind": "bone"
    },
    {
      "id": "FJ3329",
      "name": "Proximal phalanx of left big toe",
      "sourceId": "FMA43254",
      "kind": "bone"
    },
    {
      "id": "FJ3330",
      "name": "Right tenth rib",
      "sourceId": "FMA8445",
      "kind": "bone"
    },
    {
      "id": "FJ3331",
      "name": "Right eleventh rib",
      "sourceId": "FMA8531",
      "kind": "bone"
    },
    {
      "id": "FJ3332",
      "name": "Right twelfth rib",
      "sourceId": "FMA8533",
      "kind": "bone"
    },
    {
      "id": "FJ3333",
      "name": "Right first costal cartilage",
      "sourceId": "FMA7875",
      "kind": "cartilage"
    },
    {
      "id": "FJ3334",
      "name": "Right first rib",
      "sourceId": "FMA7857",
      "kind": "bone"
    },
    {
      "id": "FJ3335",
      "name": "Right second costal cartilage",
      "sourceId": "FMA7886",
      "kind": "cartilage"
    },
    {
      "id": "FJ3336",
      "name": "Right second rib",
      "sourceId": "FMA7882",
      "kind": "bone"
    },
    {
      "id": "FJ3337",
      "name": "Right third costal cartilage",
      "sourceId": "FMA7913",
      "kind": "cartilage"
    },
    {
      "id": "FJ3338",
      "name": "Right third rib",
      "sourceId": "FMA7909",
      "kind": "bone"
    },
    {
      "id": "FJ3339",
      "name": "Right fourth costal cartilage",
      "sourceId": "FMA7976",
      "kind": "cartilage"
    },
    {
      "id": "FJ3340",
      "name": "Right fourth rib",
      "sourceId": "FMA7957",
      "kind": "bone"
    },
    {
      "id": "FJ3341",
      "name": "Right fifth costal cartilage",
      "sourceId": "FMA8070",
      "kind": "cartilage"
    },
    {
      "id": "FJ3342",
      "name": "Right fifth rib",
      "sourceId": "FMA8066",
      "kind": "bone"
    },
    {
      "id": "FJ3343",
      "name": "Right sixth costal cartilage",
      "sourceId": "FMA8194",
      "kind": "cartilage"
    },
    {
      "id": "FJ3344",
      "name": "Right sixth rib",
      "sourceId": "FMA8175",
      "kind": "bone"
    },
    {
      "id": "FJ3345",
      "name": "Right seventh costal cartilage",
      "sourceId": "FMA8248",
      "kind": "cartilage"
    },
    {
      "id": "FJ3346",
      "name": "Right seventh rib",
      "sourceId": "FMA8229",
      "kind": "bone"
    },
    {
      "id": "FJ3347",
      "name": "Right eighth rib",
      "sourceId": "FMA8283",
      "kind": "bone"
    },
    {
      "id": "FJ3348",
      "name": "Right ninth rib",
      "sourceId": "FMA8364",
      "kind": "bone"
    },
    {
      "id": "FJ3349",
      "name": "Right radius",
      "sourceId": "FMA23464",
      "kind": "bone"
    },
    {
      "id": "FJ3350",
      "name": "Right first metacarpal bone",
      "sourceId": "FMA24464",
      "kind": "bone"
    },
    {
      "id": "FJ3351",
      "name": "Right first metatarsal bone",
      "sourceId": "FMA24507",
      "kind": "bone"
    },
    {
      "id": "FJ3352",
      "name": "Right second metacarpal bone",
      "sourceId": "FMA24466",
      "kind": "bone"
    },
    {
      "id": "FJ3353",
      "name": "Right second metatarsal bone",
      "sourceId": "FMA24509",
      "kind": "bone"
    },
    {
      "id": "FJ3354",
      "name": "Right third metacarpal bone",
      "sourceId": "FMA24468",
      "kind": "bone"
    },
    {
      "id": "FJ3355",
      "name": "Right third metatarsal bone",
      "sourceId": "FMA24511",
      "kind": "bone"
    },
    {
      "id": "FJ3356",
      "name": "Right fourth metacarpal bone",
      "sourceId": "FMA24470",
      "kind": "bone"
    },
    {
      "id": "FJ3357",
      "name": "Right fourth metatarsal bone",
      "sourceId": "FMA24513",
      "kind": "bone"
    },
    {
      "id": "FJ3358",
      "name": "Right fifth metacarpal bone",
      "sourceId": "FMA24472",
      "kind": "bone"
    },
    {
      "id": "FJ3359",
      "name": "Right fifth metatarsal bone",
      "sourceId": "FMA24515",
      "kind": "bone"
    },
    {
      "id": "FJ3360",
      "name": "Right calcaneus",
      "sourceId": "FMA24497",
      "kind": "bone"
    },
    {
      "id": "FJ3361",
      "name": "Right capitate",
      "sourceId": "FMA24446",
      "kind": "bone"
    },
    {
      "id": "FJ3362",
      "name": "Right clavicle",
      "sourceId": "FMA13322",
      "kind": "bone"
    },
    {
      "id": "FJ3364",
      "name": "Right cuboid bone",
      "sourceId": "FMA24528",
      "kind": "bone"
    },
    {
      "id": "FJ3365",
      "name": "Right femur",
      "sourceId": "FMA24474",
      "kind": "bone"
    },
    {
      "id": "FJ3366",
      "name": "Right fibula",
      "sourceId": "FMA24480",
      "kind": "bone"
    },
    {
      "id": "FJ3367",
      "name": "Right hamate",
      "sourceId": "FMA24448",
      "kind": "bone"
    },
    {
      "id": "FJ3368",
      "name": "Right humerus",
      "sourceId": "FMA23130",
      "kind": "bone"
    },
    {
      "id": "FJ3369",
      "name": "Right inferior nasal concha",
      "sourceId": "FMA54737",
      "kind": "bone"
    },
    {
      "id": "FJ3370",
      "name": "Right intermediate cuneiform bone",
      "sourceId": "FMA24523",
      "kind": "bone"
    },
    {
      "id": "FJ3371",
      "name": "Right lacrimal bone",
      "sourceId": "FMA53645",
      "kind": "bone"
    },
    {
      "id": "FJ3373",
      "name": "Right lateral cuneiform bone",
      "sourceId": "FMA24525",
      "kind": "bone"
    },
    {
      "id": "FJ3374",
      "name": "Right lunate",
      "sourceId": "FMA24437",
      "kind": "bone"
    },
    {
      "id": "FJ3375",
      "name": "Right maxilla",
      "sourceId": "FMA53649",
      "kind": "bone"
    },
    {
      "id": "FJ3377",
      "name": "Right medial cuneiform bone",
      "sourceId": "FMA24521",
      "kind": "bone"
    },
    {
      "id": "FJ3378",
      "name": "Right nasal bone",
      "sourceId": "FMA53647",
      "kind": "bone"
    },
    {
      "id": "FJ3379",
      "name": "Right palatine bone",
      "sourceId": "FMA53655",
      "kind": "bone"
    },
    {
      "id": "FJ3380",
      "name": "Right parietal bone",
      "sourceId": "FMA52788",
      "kind": "bone"
    },
    {
      "id": "FJ3381",
      "name": "Right patella",
      "sourceId": "FMA24486",
      "kind": "bone"
    },
    {
      "id": "FJ3382",
      "name": "Right pisiform",
      "sourceId": "FMA24441",
      "kind": "bone"
    },
    {
      "id": "FJ3383",
      "name": "Right scaphoid",
      "sourceId": "FMA24435",
      "kind": "bone"
    },
    {
      "id": "FJ3384",
      "name": "Right scapula",
      "sourceId": "FMA13395",
      "kind": "bone"
    },
    {
      "id": "FJ3385",
      "name": "Right talus",
      "sourceId": "FMA24482",
      "kind": "bone"
    },
    {
      "id": "FJ3386",
      "name": "Right temporal bone",
      "sourceId": "FMA52738",
      "kind": "bone"
    },
    {
      "id": "FJ3387",
      "name": "Right tibia",
      "sourceId": "FMA24477",
      "kind": "bone"
    },
    {
      "id": "FJ3388",
      "name": "Right trapezium",
      "sourceId": "FMA24443",
      "kind": "bone"
    },
    {
      "id": "FJ3389",
      "name": "Right trapezoid",
      "sourceId": "FMA23725",
      "kind": "bone"
    },
    {
      "id": "FJ3390",
      "name": "Right triquetral",
      "sourceId": "FMA24439",
      "kind": "bone"
    },
    {
      "id": "FJ3391",
      "name": "Right ulna",
      "sourceId": "FMA23467",
      "kind": "bone"
    },
    {
      "id": "FJ3392",
      "name": "Right zygomatic bone",
      "sourceId": "FMA52892",
      "kind": "bone"
    },
    {
      "id": "FJ3393",
      "name": "Sacrum",
      "sourceId": "FMA16202",
      "kind": "bone"
    },
    {
      "id": "FJ3394",
      "name": "Sphenoid bone",
      "sourceId": "FMA52736",
      "kind": "bone"
    },
    {
      "id": "FJ3395",
      "name": "Vomer",
      "sourceId": "FMA9710",
      "kind": "bone"
    }
  ],
  "muscles": [
    {
      "id": "FJ1452",
      "name": "Right external oblique",
      "sourceId": "FMA13336",
      "kind": "muscle"
    },
    {
      "id": "FJ1452M",
      "name": "Left external oblique",
      "sourceId": "FMA13337",
      "kind": "muscle"
    },
    {
      "id": "FJ1459",
      "name": "Right serratus anterior",
      "sourceId": "FMA13398",
      "kind": "muscle"
    },
    {
      "id": "FJ1459M",
      "name": "Left serratus anterior",
      "sourceId": "FMA13399",
      "kind": "muscle"
    },
    {
      "id": "FJ1573",
      "name": "Left sternocleidomastoid",
      "sourceId": "FMA13409",
      "kind": "muscle"
    },
    {
      "id": "FJ1595",
      "name": "Right sternocleidomastoid",
      "sourceId": "FMA13408",
      "kind": "muscle"
    },
    {
      "id": "FJ1418",
      "name": "Right gluteus maximus",
      "sourceId": "FMA22328",
      "kind": "muscle"
    },
    {
      "id": "FJ1418M",
      "name": "Left gluteus maximus",
      "sourceId": "FMA22329",
      "kind": "muscle"
    },
    {
      "id": "FJ1419",
      "name": "Right gluteus medius",
      "sourceId": "FMA22330",
      "kind": "muscle"
    },
    {
      "id": "FJ1419M",
      "name": "Left gluteus medius",
      "sourceId": "FMA22331",
      "kind": "muscle"
    },
    {
      "id": "FJ1434",
      "name": "Right sartorius",
      "sourceId": "FMA22354",
      "kind": "muscle"
    },
    {
      "id": "FJ1434M",
      "name": "Left sartorius",
      "sourceId": "FMA22355",
      "kind": "muscle"
    },
    {
      "id": "FJ1436",
      "name": "Right semitendinosus",
      "sourceId": "FMA22358",
      "kind": "muscle"
    },
    {
      "id": "FJ1436M",
      "name": "Left semitendinosus",
      "sourceId": "FMA22359",
      "kind": "muscle"
    },
    {
      "id": "FJ1433",
      "name": "Right rectus femoris",
      "sourceId": "FMA38928",
      "kind": "muscle"
    },
    {
      "id": "FJ1433M",
      "name": "Left rectus femoris",
      "sourceId": "FMA38929",
      "kind": "muscle"
    },
    {
      "id": "FJ1442",
      "name": "Right vastus lateralis",
      "sourceId": "FMA38930",
      "kind": "muscle"
    },
    {
      "id": "FJ1442M",
      "name": "Left vastus lateralis",
      "sourceId": "FMA38931",
      "kind": "muscle"
    },
    {
      "id": "FJ1443",
      "name": "Right vastus medialis",
      "sourceId": "FMA38932",
      "kind": "muscle"
    },
    {
      "id": "FJ1443M",
      "name": "Left vastus medialis",
      "sourceId": "FMA38933",
      "kind": "muscle"
    },
    {
      "id": "FJ1435",
      "name": "Right semimembranosus",
      "sourceId": "FMA22448",
      "kind": "muscle"
    },
    {
      "id": "FJ1435M",
      "name": "Left semimembranosus",
      "sourceId": "FMA22449",
      "kind": "muscle"
    },
    {
      "id": "FJ1439",
      "name": "Right tibialis anterior",
      "sourceId": "FMA22544",
      "kind": "muscle"
    },
    {
      "id": "FJ1439M",
      "name": "Left tibialis anterior",
      "sourceId": "FMA22545",
      "kind": "muscle"
    },
    {
      "id": "FJ1437",
      "name": "Right soleus",
      "sourceId": "FMA22558",
      "kind": "muscle"
    },
    {
      "id": "FJ1437M",
      "name": "Left soleus",
      "sourceId": "FMA22559",
      "kind": "muscle"
    },
    {
      "id": "FJ1554",
      "name": "Transverse part of right trapezius",
      "sourceId": "FMA33584",
      "kind": "muscle"
    },
    {
      "id": "FJ1554M",
      "name": "Transverse part of left trapezius",
      "sourceId": "FMA33585",
      "kind": "muscle"
    },
    {
      "id": "FJ1520",
      "name": "Ascending part of right trapezius",
      "sourceId": "FMA33581",
      "kind": "muscle"
    },
    {
      "id": "FJ1520M",
      "name": "Ascending part of left trapezius",
      "sourceId": "FMA33583",
      "kind": "muscle"
    },
    {
      "id": "FJ1521",
      "name": "Descending part of right trapezius",
      "sourceId": "FMA33586",
      "kind": "muscle"
    },
    {
      "id": "FJ1521M",
      "name": "Descending part of left trapezius",
      "sourceId": "FMA33587",
      "kind": "muscle"
    },
    {
      "id": "FJ1467",
      "name": "Acromial part of right deltoid",
      "sourceId": "FMA34682",
      "kind": "muscle"
    },
    {
      "id": "FJ1467M",
      "name": "Acromial part of left deltoid",
      "sourceId": "FMA34683",
      "kind": "muscle"
    },
    {
      "id": "FJ1468",
      "name": "Clavicular part of right deltoid",
      "sourceId": "FMA34680",
      "kind": "muscle"
    },
    {
      "id": "FJ1468M",
      "name": "Clavicular part of left deltoid",
      "sourceId": "FMA34681",
      "kind": "muscle"
    },
    {
      "id": "FJ1513",
      "name": "Spinal part of right deltoid",
      "sourceId": "FMA34684",
      "kind": "muscle"
    },
    {
      "id": "FJ1513M",
      "name": "Spinal part of left deltoid",
      "sourceId": "FMA34685",
      "kind": "muscle"
    },
    {
      "id": "FJ1446",
      "name": "Abdominal part of right pectoralis major",
      "sourceId": "FMA45874",
      "kind": "muscle"
    },
    {
      "id": "FJ1446M",
      "name": "Abdominal part of left pectoralis major",
      "sourceId": "FMA45875",
      "kind": "muscle"
    },
    {
      "id": "FJ1464",
      "name": "Sternocostal part of right pectoralis major",
      "sourceId": "FMA79979",
      "kind": "muscle"
    },
    {
      "id": "FJ1464M",
      "name": "Sternocostal part of left pectoralis major",
      "sourceId": "FMA79980",
      "kind": "muscle"
    },
    {
      "id": "FJ1447",
      "name": "Clavicular part of right pectoralis major",
      "sourceId": "FMA34690",
      "kind": "muscle"
    },
    {
      "id": "FJ1447M",
      "name": "Clavicular part of left pectoralis major",
      "sourceId": "FMA34691",
      "kind": "muscle"
    },
    {
      "id": "FJ1486",
      "name": "Right brachialis",
      "sourceId": "FMA37668",
      "kind": "muscle"
    },
    {
      "id": "FJ1486M",
      "name": "Left brachialis",
      "sourceId": "FMA37669",
      "kind": "muscle"
    },
    {
      "id": "FJ1512",
      "name": "Short head of right biceps brachii",
      "sourceId": "FMA37684",
      "kind": "muscle"
    },
    {
      "id": "FJ1512M",
      "name": "Short head of left biceps brachii",
      "sourceId": "FMA37685",
      "kind": "muscle"
    },
    {
      "id": "FJ1478",
      "name": "Long head of right biceps brachii",
      "sourceId": "FMA37686",
      "kind": "muscle"
    },
    {
      "id": "FJ1478M",
      "name": "Long head of left biceps brachii",
      "sourceId": "FMA37687",
      "kind": "muscle"
    },
    {
      "id": "FJ1479",
      "name": "Long head of right triceps brachii",
      "sourceId": "FMA37699",
      "kind": "muscle"
    },
    {
      "id": "FJ1479M",
      "name": "Long head of left triceps brachii",
      "sourceId": "FMA37700",
      "kind": "muscle"
    },
    {
      "id": "FJ1480",
      "name": "Medial head of right triceps brachii",
      "sourceId": "FMA37695",
      "kind": "muscle"
    },
    {
      "id": "FJ1480M",
      "name": "Medial head of left triceps brachii",
      "sourceId": "FMA37696",
      "kind": "muscle"
    },
    {
      "id": "FJ1477",
      "name": "Lateral head of right triceps brachii",
      "sourceId": "FMA37697",
      "kind": "muscle"
    },
    {
      "id": "FJ1477M",
      "name": "Lateral head of left triceps brachii",
      "sourceId": "FMA37698",
      "kind": "muscle"
    },
    {
      "id": "FJ1487",
      "name": "Right brachioradialis",
      "sourceId": "FMA38486",
      "kind": "muscle"
    },
    {
      "id": "FJ1487M",
      "name": "Left brachioradialis",
      "sourceId": "FMA38487",
      "kind": "muscle"
    },
    {
      "id": "FJ1395",
      "name": "Long head of right biceps femoris",
      "sourceId": "FMA45888",
      "kind": "muscle"
    },
    {
      "id": "FJ1395M",
      "name": "Long head of left biceps femoris",
      "sourceId": "FMA45889",
      "kind": "muscle"
    },
    {
      "id": "FJ1444",
      "name": "Short head of right biceps femoris",
      "sourceId": "FMA45891",
      "kind": "muscle"
    },
    {
      "id": "FJ1444M",
      "name": "Short head of left biceps femoris",
      "sourceId": "FMA45892",
      "kind": "muscle"
    },
    {
      "id": "FJ1394",
      "name": "Lateral head of right gastrocnemius",
      "sourceId": "FMA45960",
      "kind": "muscle"
    },
    {
      "id": "FJ1394M",
      "name": "Lateral head of left gastrocnemius",
      "sourceId": "FMA45961",
      "kind": "muscle"
    },
    {
      "id": "FJ1397",
      "name": "Medial head of right gastrocnemius",
      "sourceId": "FMA45957",
      "kind": "muscle"
    },
    {
      "id": "FJ1397M",
      "name": "Medial head of left gastrocnemius",
      "sourceId": "FMA45958",
      "kind": "muscle"
    }
  ]
};
export const systemAssets:Record<SystemId,{file:string;description:string;label:string}> = {
  "skeleton": {
    "label": "Skeletal system",
    "file": "/models/skeleton.glb",
    "description": "238 named skeletal parts in their anatomical positions, including bone specimens, intervertebral discs and costal cartilages. This source collection does not contain every adult bone."
  },
  "muscles": {
    "label": "Major muscles",
    "file": "/models/muscles.glb",
    "description": "66 named components of major skeletal muscles, preserved in their source anatomical positions. Includes bilateral muscles and separately modelled heads or regions; this is a selected collection, not every muscle."
  }
};
