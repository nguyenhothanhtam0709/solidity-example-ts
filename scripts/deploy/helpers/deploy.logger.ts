import { Contract } from 'ethers';

interface DeployLoggerParamsInterface {
	instance: Contract;
	contractName: string;
}

interface DeployLoggerOptionsInterface {
	verbose: boolean;
}

export const deployLogger = async (
	{ instance, contractName }: DeployLoggerParamsInterface,
	{ verbose = true }: DeployLoggerOptionsInterface
) => {
	const { address: contractAddress } = instance;

	if (!verbose) {
		console.log(`Deployed ${contractName}: ${contractAddress}`);
	} else {
		const {
			deployTransaction: { hash, gasPrice, timestamp },
		} = instance;

		console.log(`### ${contractName} ###`);
		console.log(`Address: ${contractAddress}`);
		console.log(`Transaction hash: ${hash}`);
		gasPrice && console.log(`Gas price: ${gasPrice}`);
		timestamp && console.log(`Timestamp: ${timestamp}`);
	}
};
