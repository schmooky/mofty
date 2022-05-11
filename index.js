const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const console = require("console");
var clc = require("cli-color");

const { program } = require('commander');

program
  .option('-i, --inputDir [string]', 'Specify input nft collection images', './layers')
  .option('-o, --outputDir [string]', 'Specify output nft collection directory', './outputs')
  .option('-c, --count [string]', 'Specify nft collection size', 1)
  .option('-t, --traits <string>', 'Specify trait priority', '')

program.parse();

const options = program.opts();

const imageFormat = {
  width: 2048,
  height: 2048
};

const dir = {
  traitTypes: `${options.inputDir}/trait_types`,
  background: `${options.inputDir}/background`,
}

let totalOutputs = 0;

const canvas = createCanvas(imageFormat.width, imageFormat.height);
const ctx = canvas.getContext("2d");

const priorities = options.traits.split(' ');
console.log(clc.magentaBright(`With priorities: ${priorities}`))

const main = async (numberOfOutputs) => {
  const traitTypesDir = dir.traitTypes;
  const types = fs.readdirSync(traitTypesDir);

  const traitTypes = priorities.concat(types.filter(x => !priorities.includes(x)))
    .map(traitType => (
      fs.readdirSync(`${traitTypesDir}/${traitType}/`)
        .map(value => {
          return { trait_type: traitType, value: value }
        }).concat({ trait_type: traitType, value: 'N/A' })
    ));

  const backgrounds = fs.readdirSync(dir.background);

  const combinations = allPossibleCases(traitTypes, numberOfOutputs)

  for (var n = 0; n < combinations.length; n++) {
    const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)]
    await drawImage(combinations[n], randomBackground, n);
  }
};

const recreateOutputsDir = () => {
  if (fs.existsSync(options.outputDir)) {
    fs.rmdirSync(options.outputDir, { recursive: true });
  }
  fs.mkdirSync(options.outputDir);
  fs.mkdirSync(`${options.outputDir}/metadata`);
  fs.mkdirSync(`${options.outputDir}/images`);
};

const allPossibleCases = (arraysToCombine, max) => {
  const divisors = [];
  let permsCount = 1;

  for (let i = arraysToCombine.length - 1; i >= 0; i--) {
    divisors[i] = divisors[i + 1] ? divisors[i + 1] * arraysToCombine[i + 1].length : 1;
    permsCount *= (arraysToCombine[i].length || 1);
  }


  if (!!max && max > 0) {
    console.log(max);
    permsCount = max;
  }

  totalOutputs = permsCount;


  const getCombination = (n, arrays, divisors) => arrays.reduce((acc, arr, i) => {
    acc.push(arr[Math.floor(n / divisors[i]) % arr.length]);
    return acc;
  }, []);

  const combinations = [];
  for (let i = 0; i < permsCount; i++) {
    combinations.push(getCombination(i, arraysToCombine, divisors));
  }

  return combinations;

  return [];
};


const drawImage = async (traitTypes, background, index) => {

  const backgroundIm = await loadImage(`${dir.background}/${background}`);

  ctx.drawImage(backgroundIm, 0, 0, imageFormat.width, imageFormat.height);

  const drawableTraits = traitTypes.filter(x => x.value !== 'N/A')
  for (let index = 0; index < drawableTraits.length; index++) {
    const val = drawableTraits[index];
    const image = await loadImage(`${dir.traitTypes}/${val.trait_type}/${val.value}`);
    ctx.drawImage(image, 0, 0, imageFormat.width, imageFormat.height);
  }

  let metaDrawableTraits = JSON.parse(JSON.stringify(drawableTraits))

  metaDrawableTraits.map(x => {
    x.value = x.value.substring(0, x.value.length - 4)
    return x
  })

  fs.writeFileSync(
    `${options.outputDir}/metadata/${index + 1}.json`,
    JSON.stringify({
      name: `image ${index}`,
      description: 'Some art NFT',
      image: `ipfs://someURIThatHasToBeProbided/${index}.png`,
      attributes: metaDrawableTraits
    }, null, 2),
    function (err) {
      if (err) throw err;
    }
  )

  // save image 
  fs.writeFileSync(
    `${options.outputDir}/images/${index + 1}.png`,
    canvas.toBuffer("image/png")
  );
}

//main
(() => {
  recreateOutputsDir();

  console.log(clc.greenBright(`Creating collection of ${options.count} images`));
  main(options.count ?? 1);
})();
