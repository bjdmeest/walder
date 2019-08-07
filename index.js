'use strict';

const program = require('commander');
const fs = require('fs');
const YAML = require('yaml');

// CLI
program
    .version('0.0.1', '-v, --version')
    .option('-i, --input <configFile>', 'YAML configuration file input.')
    .option('-o, --output [outputDirectory]', 'output directory. Default: CWD')
    .parse(process.argv);

if (!program.input) {
    console.error('\nError:\n\t--input <configFile> required. Use -h for more info.\n');
    process.exit(1);
}

// Output files
let outputDirectory = '.';
if (program.output) {
    if (program.output.endsWith('/')) {
        outputDirectory = program.output.slice(0, -1);
    } else {
        outputDirectory = program.output;
    }

    // Create directory if it does not exist yet
    if (!fs.existsSync(outputDirectory)){
        fs.mkdirSync(outputDirectory, { recursive: true });
    }
}
const routesOutput = outputDirectory + '/routes.js';
const graphQLLDOutput = outputDirectory + '/graphQLLD.js';
const pipeModulesOuput = outputDirectory + '/pipeModules.js';

// Create/Clear output files
fs.writeFileSync(routesOutput, '');
fs.writeFileSync(graphQLLDOutput, '');
fs.writeFileSync(pipeModulesOuput, '');

// Data sources
const DataSourceParser = require('./bin/parsers/DataSourceParser');

// Routes
const RouteParser = require('./bin/parsers/RouteParser');
const RouteWriter = require('./bin/writers/RouteWriter');

// GraphQL-LD
const GraphQLLDParser = require('./bin/parsers/GraphQLLDParser');
const GraphQLLDWriter = require('./bin/writers/GraphQLLDWriter');

// Pipe modules
const PipeModuleParser = require('./bin/parsers/PipeModuleParser');
const PipeModuleLoader = require('./bin/loaders/PipeModuleLoader');
const PipeModuleWriter = require('./bin/writers/PipeModuleWriter');

// Parse the config file
const configFilePath = './meta/config_example.yaml';
const file = fs.readFileSync(configFilePath, 'utf8');
const yamlData = YAML.parse(file);

const dataSources = new DataSourceParser(yamlData).parse();

const routeWriter = new RouteWriter(routesOutput);
const graphQLLWriter = new GraphQLLDWriter(graphQLLDOutput, dataSources);
const pipeModulesWriter = new PipeModuleWriter(pipeModulesOuput);

routeWriter.preWrite();
graphQLLWriter.preWrite();
pipeModulesWriter.preWrite();

for (let path in yamlData.paths) {
    for (let method in yamlData.paths[path]) {
        // GraphQL
        const graphQLLD = new GraphQLLDParser(method, path, yamlData).parse();
        graphQLLWriter.write(graphQLLD);

        // Pipe modules
        const pipeModules = new PipeModuleParser(yamlData.paths[path][method].postprocessing).parse();
        const loadingPipeModules = new PipeModuleLoader(pipeModules).load();
        pipeModulesWriter.write(pipeModules, loadingPipeModules);

        // Routes
        const route = new RouteParser(method, path, yamlData).parse();
        routeWriter.write(route, graphQLLWriter, pipeModulesWriter);

        // HTMLTemplate
    }
}

graphQLLWriter.postWrite();
pipeModulesWriter.postWrite();
routeWriter.postWrite();