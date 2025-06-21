var fs = require("fs");

let oldArray = [7,438,247,546,875,415,276,407,224,382,603,533,593,236,360,556,576,225,509,543,351,602,242,573,590,376,392,5,46,395,540,580,138,56,523,620,40,23,553,44,453,20,55,497,278,264,338,43,599,623,26,412,101,80,70,265,88,625,563,690,541,92,314,448,440,691,734,402,595,694,527,243,30,758,710,330,619,480,714,374,389,328,692,31,396,706,286,35,406,10,252,41,707,364,273,735,341,287,425,677,739,404,414,624,77,59,261,559,658,504,486,473,728,333,385,379,671,545,445,492,307,42,649,672,283,34,249,71,688,63,431,28,778,607,32,639,505,745,27,474,275,554,562,581,433,84,524,248,655,586,378,355,399,53,241,724,97,484,466,475,226,754,317,682,284,589,481,752,367,285,430,17,570,670,51,772,632,510,227,0,104,4,770,737,584,109,289,712,348,9,458,608,398,24,534,87,756,704,718,417,585,69,675,306,67,64,702,696,558,335,512,740,687,98,645,50,464,482,628,471,763,359,47,719,368,266,45,49,409,757,361,61,597,561,73,429,654,108,557,72,673,769,640,519,239,75,476,296,699,1,308,522,459,18,617,713,232,454,65,311,716,503,2,809,802,271,52,74,36,48,708,592,38,3,393,258,521,822,29,779,791,490,358,111,58,564,292,12,250,659,766,99,813,363,96,62,803,6,8,662,799,532,334,784,370,613,260,267,337,520,460,82,344,506,676,793,786,787,371,818,838,16,290,85,686,720,33,54,79,789,320,13,301,501,309,100,21,610,695,816,680,681,22,544,868,81,578,587,279,83,388,683,405,416,319,274,717,637,794,648,776,773,571,397,269,221,661,112,142,743,653,829,494,729,526,447,37,788,709,771,881,684,843,722,874,107,386,685,449,528,170,827,372,237,179,820,240,765,150,384,674,495,95,469,744,701,594,496,255,365,11,340,123,468,25,155,94,159,14,143,869,419,759,866,78,600,435,633,837,848,188,611,164,323,749,796,353,733,877,660,727,147,19,234,39,105,650,711,815,15,130,529,596,572,651,263,362,93,531,444,723,668,60,410,228,394,854,329,298,324,535,352,381,870,90,89,498,128,703,455,828,785,66,57,835,741,872,102,213,439,281,569,808,804,387,110,91,76,68,86,126,190,231,106,606,865,132,103,575,456,751,169,366,477,795,257,518,139,507,233,336,124,470,679,229,230,327,693,194,245,152,180,508,814,863,616,873,148,282,747,856,291,424,833,583,488,567,630,113,136,332,206,601,840,345,782,277,697,499,208,461,173,156,380,646,350,626,861,849,821,119,636,656,408,294,698,161,502,810,369,797,663,295,667,268,883,162,700,251,185,537,618,678,450,253,768,117,184,513,349,182,721,135,118,591,428,615,217,116,819,133,715,199,841,560,160,783,356,403,145,726,730,326,322,800,331,209,487,705,689,825,762,862,547,244,627,748,642,172,750,530,857,214,115,427,310,154,149,516,235,272,204,141,609,574,511,238,647,621,418,812,200,436,738,191,643,120,767,114,127,880,167,201,137,755,736,129,860,223,165,774,552,288,565,669,166,151,801,146,731,212,588,742,434,641,400,181,876,515,850,568,775,441,612,665,761,318,280,760,462,781,163,493,246,321,465,451,171,121,792,604,187,855,805,216,413,211,485,664,878,131,259,198,189,203,175,452,254,539,491,193,354,178,732,777,780,538,631,270,830,826,566,343,622,764,207,383,262,858,577,339,218,753,300,373,598,220,790,657,325,134,377,725,652,489,305,463,582,122,542,746,391,579,222,205,851,517,347,867,614,140,644,844,125,144,483,634,846,357,375,157,798,635,390,555,467,629,831,293,423,666,852,886,192,885,842,342,514,605,638,879,411,313,153,299,479,421,549,478,806,197,158,176,177,426,834,443,312,183,500,297,864,536,446,823,457,202,817,302,859,525,215,168,432,422,884,847,315,548,196,550,824,304,442,174,472,839,832,195,420,807,219,871,853,316]
let oldCacheFilename = "./Nine Worlds Series - Victoria Goddard.json"
let newCacheFilename = "./Nine Worlds Series - Victoria Goddard - update.json"

getFicId = (ficLink) => {
    const ao3Link = "https://archiveofourown.org/works/"
    return ficLink.slice(ao3Link.length);
}

updateFicCacheArray = async () => {

    // Sort the array so it's easier to see what's happening
    oldArray.sort(function (a, b) { return a - b });
    let newArray = oldArray.slice();

    let oldFicCache = require(oldCacheFilename);
    let newFicCache = require(newCacheFilename);

    let iOldIndex = 0;
    let iNewIndex = 0;

    while (iOldIndex < oldFicCache.length) {
        let oldFicId = getFicId(oldFicCache[iOldIndex].link);
        let newFicId = getFicId(newFicCache[iNewIndex].link);

        console.log("oldFicId = " + oldFicId + "; newFicId = " + newFicId);

        if (oldFicId == newFicId) {
            console.log("Fic " + oldFicId + " unchanged")
            iNewIndex++;
            iOldIndex++;
            continue;
        }

        if (Number(oldFicId) < Number(newFicId)) {
            console.log(oldFicId + " deleted!")

            // The fic at iOldIndex has been deleted. Update the array by: 

            // (1) removing that index if present
            newArray = newArray.filter(function (index) {
                if (index == iOldIndex) {
                    console.log("Removing index " + iOldIndex)
                }
                return index != iOldIndex;
            })

            // (2) decreasing the index of all items at later indices  
            newArray = newArray.map(function (index) {
                if (index > iOldIndex) {
                    console.log("Changing index " + index + " to " + (index - 1))
                    return index - 1;
                }
                else {
                    return index;
                }
            })

            iOldIndex++;
        }
        else {
            console.log(newFicId + " added!")

            // The fic at iNewIndex has been inserted. Update the array by 

            // (1) Increasing the value of all items at that index or later   
            newArray = newArray.map(function (index) {
                if (index >= iNewIndex) {
                    console.log("Changing index " + index + " to " + (index + 1))
                    return index + 1;
                }
                else {
                    return index;
                }
            })

            // (2) Add that index to the array  
            console.log("Adding index " + iNewIndex)
            newArray.push(iNewIndex);

            iNewIndex++;
        }
    }

    // We've reached the end of the old cache, but there may be more in the new cache
    while (iNewIndex < newFicCache.length) {
        let newFicId = getFicId(newFicCache[iNewIndex].link);
        console.log("newFicId = " + newFicId + " added!");
        console.log("Adding index " + iNewIndex)
        newArray.push(iNewIndex);
        iNewIndex++;
    }

    let arrayUpdates = {};
    
    // The old array (already sorted)
    arrayUpdates.oldArraySorted = oldArray;

    // The new array 
    arrayUpdates.newArray = newArray;

    // The new array re-randomised
    arrayUpdates.newArrayRandomized = newArray.slice();
    arrayUpdates.newArrayRandomized.sort(function (a, b) { return Math.random() - 0.5 });

    fs.writeFileSync("ArrayUpdates.json", JSON.stringify(arrayUpdates), () => { });
}

updateFicCacheArray();