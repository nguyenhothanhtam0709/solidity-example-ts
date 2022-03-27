import { ethers } from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { solidity } from 'ethereum-waffle';
import { BlindAuction } from '../typechain/BlindAuction';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { sleep } from '../helpers/timer';

chai.use(solidity);
chai.use(chaiAsPromised);
const { expect } = chai;

interface BlinedBidDataInterface {
	value: number;
	fake: boolean;
	secret: string;
}

interface RevealDataInterface {
	value: number[];
	fake: boolean[];
	secret: string[];
}

describe('Blind Auction', () => {
	let auction: BlindAuction;
	let signers: SignerWithAddress[];
	let beneficiaryAddress: string;

	const deployAuction = async (
		biddingTime: number,
		revealTime: number,
		beneficiaryAddress: string
	) => {
		const auctionFactory = await ethers.getContractFactory(
			'BlindAuction',
			signers[0]
		);
		auction = (await auctionFactory.deploy(
			biddingTime,
			revealTime,
			beneficiaryAddress
		)) as BlindAuction;
		await auction.deployed();
	};

	const getAuctionContract = async (signer: SignerWithAddress) =>
		(await ethers.getContractAt(
			'BlindAuction',
			auction.address,
			signer
		)) as BlindAuction;

	const formatBytes32String = (str: string) =>
		ethers.utils.formatBytes32String(str);

	const bid = async (
		auctionContract: BlindAuction,
		{ value, fake, secret }: BlinedBidDataInterface
	) => {
		const encoded = ethers.utils.solidityKeccak256(
			['uint256', 'bool', 'bytes32'],
			[value, fake, formatBytes32String(secret)]
		);

		await auctionContract.bid(encoded, {
			value,
		});
	};

	const bidAction = async (
		signer: SignerWithAddress,
		{ value, fake, secret }: BlinedBidDataInterface
	) => {
		const auctionContract = await getAuctionContract(signer);
		await bid(auctionContract, { value, fake, secret });
	};

	const revealAction = async (
		signer: SignerWithAddress,
		{ value, fake, secret }: RevealDataInterface
	) => {
		const auctionContract = await getAuctionContract(signer);
		await auctionContract.reveal(value, fake, secret);
	};

	before(async () => {
		signers = await ethers.getSigners();
		beneficiaryAddress = signers[10].address;
	});

	describe('bidding time test', async () => {
		const biddingTime = 600;
		const revealTime = 600;
		beforeEach(async () => {
			await deployAuction(biddingTime, revealTime, beneficiaryAddress);

			expect(auction.address).to.properAddress;
			expect(await auction.beneficiary()).to.eq(beneficiaryAddress);
		});

		it('should bid', async () => {
			await bidAction(signers[1], {
				value: 5,
				fake: false,
				secret: 'signer 1',
			});
			expect((await auction.bids(signers[1].address, 0)).deposit).to.eq(5);
		});

		it('should re-bid', async () => {
			await bidAction(signers[1], {
				value: 5,
				fake: false,
				secret: 'signer 1',
			});
			expect((await auction.bids(signers[1].address, 0)).deposit).to.eq(5);

			// re-bid
			await bidAction(signers[1], {
				value: 3,
				fake: false,
				secret: 'signer 1 - 2',
			});
			expect((await auction.bids(signers[1].address, 1)).deposit).to.eq(3);
		});

		it('should bid 2', async () => {
			await bidAction(signers[2], {
				value: 10,
				fake: false,
				secret: 'signer 2',
			});
			expect((await auction.bids(signers[2].address, 0)).deposit).to.eq(10);
		});

		it('cannot reveal before reveal time start', async () => {
			await bidAction(signers[1], {
				value: 5,
				fake: false,
				secret: 'signer 1',
			});
			expect((await auction.bids(signers[1].address, 0)).deposit).to.eq(5);

			await sleep(1000); // sleep 1s

			await expect(
				revealAction(signers[1], {
					value: [5],
					fake: [false],
					secret: [formatBytes32String('signer 1')],
				})
			).to.be.rejectedWith('TooEarly');
		});
	});

	describe('reveal time test', async () => {
		const biddingTime = 5;
		const revealTime = 100;
		beforeEach(async () => {
			await deployAuction(biddingTime, revealTime, beneficiaryAddress);

			await bidAction(signers[1], {
				value: 5,
				fake: false,
				secret: 'signer 1 - 1',
			});

			await bidAction(signers[2], {
				value: 10,
				fake: false,
				secret: 'signer 2 - 1',
			});
		});

		it('cannot bid', async () => {
			await sleep(5000);

			await expect(
				bidAction(signers[1], {
					value: 7,
					fake: false,
					secret: 'signer 1 - 2',
				})
			).to.be.rejectedWith('TooLate');
		});

		it('should reveal', async () => {
			await bidAction(signers[2], {
				value: 12,
				fake: false,
				secret: 'signer 2 - 2',
			});

			await sleep(5000);
			await revealAction(signers[2], {
				value: [10, 12],
				fake: [false, false],
				secret: [
					formatBytes32String('signer 2 - 1'),
					formatBytes32String('signer 2 - 2'),
				],
			});

			expect(await auction.highestBid()).to.eq(12);
		});

		it('should reveal 2', async () => {
			await bidAction(signers[2], {
				value: 12,
				fake: false,
				secret: 'signer 2 - 2',
			});

			await sleep(5000);
			await revealAction(signers[2], {
				value: [10, 12],
				fake: [false, true],
				secret: [
					formatBytes32String('signer 2 - 1'),
					formatBytes32String('signer 2 - 2'),
				],
			});

			expect(await auction.highestBid()).to.eq(10);
		});

		it('cannot end auction before endtime', async () => {
			await sleep(5000);
			await expect(auction.auctionEnd()).to.be.rejectedWith('TooEarly');
		});
	});

	describe('auction endtime test', async () => {
		const biddingTime = 2; // 2s
		const revealTime = 1;
		beforeEach(async () => {
			await deployAuction(biddingTime, revealTime, beneficiaryAddress);

			await bidAction(signers[1], {
				value: 10,
				fake: false,
				secret: 'signer 1',
			});

			await sleep(3000); // sleep 3s
			await auction.auctionEnd();
		});

		it('should end auction', async () => {
			await sleep(3000);
			expect(await auction.ended()).to.true;
		});

		it('cannot reveal after auction endtime', async () => {
			await expect(
				revealAction(signers[1], {
					value: [10],
					fake: [false],
					secret: [formatBytes32String('signer 1')],
				})
			).to.be.rejectedWith('TooLate');
		});
	});
});
