import { ethers } from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { solidity } from 'ethereum-waffle';
import { SimpleAuction } from '../typechain/SimpleAuction';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { sleep } from '../helpers/timer';

chai.use(solidity);
chai.use(chaiAsPromised);
const { expect } = chai;

describe('Simple Auction', () => {
	let auction: SimpleAuction;
	let signers: SignerWithAddress[];
	let beneficiaryAddress: string;

	const deployAuction = async (
		biddingTime: number,
		beneficiaryAddress: string
	) => {
		const auctionFactory = await ethers.getContractFactory(
			'SimpleAuction',
			signers[0]
		);
		auction = (await auctionFactory.deploy(
			biddingTime,
			beneficiaryAddress
		)) as SimpleAuction;
		await auction.deployed();
	};

	const getAuctionContract = async (signer: SignerWithAddress) =>
		(await ethers.getContractAt(
			'SimpleAuction',
			auction.address,
			signer
		)) as SimpleAuction;

	before(async () => {
		signers = await ethers.getSigners();
		beneficiaryAddress = signers[10].address;
	});

	describe('bidding simple test', async () => {
		const biddingTime = 3600; // 1h

		beforeEach(async () => {
			await deployAuction(biddingTime, beneficiaryAddress);

			expect(auction.address).to.properAddress;
			expect(await auction.beneficiary()).to.eq(beneficiaryAddress);
		});

		describe('bid', async () => {
			it('should bid', async () => {
				const auctionContract = await getAuctionContract(signers[1]);
				await auctionContract.bid({
					value: 10,
				});

				expect(await auction.highestBidder()).to.eq(signers[1].address);
				expect(await auction.highestBid()).to.eq(10);
			});

			it('should re-bid', async () => {
				const auctionContract = await getAuctionContract(signers[1]);
				await auctionContract.bid({
					value: 10,
				});
				await auctionContract.bid({
					value: 15,
				});

				expect(await auction.highestBidder()).to.eq(signers[1].address);
				expect(await auction.highestBid()).to.eq(15);
			});

			it('should bid 2', async () => {
				const auctionContract1 = await getAuctionContract(signers[1]);
				await auctionContract1.bid({
					value: 10,
				});

				const auctionContract2 = await getAuctionContract(signers[2]);
				await auctionContract2.bid({
					value: 15,
				});

				expect(await auction.highestBidder()).to.eq(signers[2].address);
				expect(await auction.highestBid()).to.eq(15);
			});

			it('cannot bid with smaller value than current highestBid', async () => {
				const testFunc = async () => {
					const auctionContract1 = await getAuctionContract(signers[1]);
					await auctionContract1.bid({
						value: 10,
					});

					const auctionContract2 = await getAuctionContract(signers[2]);
					await auctionContract2.bid({
						value: 5,
					});
				};

				await expect(testFunc()).to.be.rejectedWith('BidNotHighEnough(10)');
			});
		});

		describe('withdraw', async () => {
			beforeEach(async () => {
				const auctionContract1 = await getAuctionContract(signers[1]);
				await auctionContract1.bid({
					value: 10,
				});
			});

			it('should withdraw', async () => {
				const auctionContract2 = await getAuctionContract(signers[2]);
				await auctionContract2.bid({
					value: 15,
				});

				const auctionContract1 = await getAuctionContract(signers[1]);
				// using callStatic to get result from function withdraw - which not
				// public view for offchain
				const result = await auctionContract1.callStatic.withdraw();
				expect(result).to.true;
			});
		});
	});

	describe('auction end time testing', async () => {
		describe('auction ending', async () => {
			const biddingTime = 5; // 5s

			beforeEach(async () => {
				await deployAuction(biddingTime, beneficiaryAddress);

				const auctionContract1 = await getAuctionContract(signers[1]);
				await auctionContract1.bid({
					value: 10,
				});

				const auctionContract2 = await getAuctionContract(signers[2]);
				await auctionContract2.bid({
					value: 15,
				});
			});

			it('should ending', async () => {
				await sleep(5000); // waiting for aution to be ended
				await expect(auction.auctionEnd()).not.to.be.rejected;
			});

			it('cannot ending before auctionEndTime', async () => {
				await expect(auction.auctionEnd()).to.be.rejectedWith(
					'AuctionNotYetEnded'
				);
			});

			it('cannot call recall auctionEnd', async () => {
				await sleep(5000); // waiting for aution to be ended
				await auction.auctionEnd();
				await expect(auction.auctionEnd()).to.be.rejectedWith(
					'AuctionEndAlreadyCalled'
				);
			});
		});

		describe('postending case', async () => {
			const biddingTime = 3; // 5s

			beforeEach(async () => {
				await deployAuction(biddingTime, beneficiaryAddress);

				const auctionContract1 = await getAuctionContract(signers[1]);
				await auctionContract1.bid({
					value: 10,
				});

				const auctionContract2 = await getAuctionContract(signers[2]);
				await auctionContract2.bid({
					value: 15,
				});

				await auction.auctionEnd();
			});

			it('cannot bid after auction end', async () => {
				const auctionContract = await getAuctionContract(signers[3]);
				await expect(
					auctionContract.bid({
						value: 15,
					})
				).to.be.rejectedWith('AuctionAlreadyEnded');
			});
		});
	});
});
