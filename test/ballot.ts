import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Ballot } from "../typechain/Ballot";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);
const { expect } = chai;
const nullAddress = "0x0000000000000000000000000000000000000000";

describe("Ballot", () => {
  let ballot: Ballot; // this Ballot contract is called by chairperson (who is signer 0)
  let signers: SignerWithAddress[];

  const proposal1 = "name 1";
  const proposal2 = "name 2";
  const proposal3 = "name 3";
  const proposal1Format = ethers.utils.formatBytes32String(proposal1);
  const proposal2Format = ethers.utils.formatBytes32String(proposal2);
  const proposal3Format = ethers.utils.formatBytes32String(proposal3);
  const proposalNames = [proposal1Format, proposal2Format, proposal3Format];

  let getBallotContract = async (signer: SignerWithAddress) =>
    (await ethers.getContractAt("Ballot", ballot.address, signer)) as Ballot;

  before(async () => {
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    const ballotFactory = await ethers.getContractFactory("Ballot", signers[0]);
    ballot = (await ballotFactory.deploy(proposalNames)) as Ballot;
    await ballot.deployed();

    const chairperson = await ballot.chairperson();
    expect(chairperson).to.eq(signers[0].address);
    expect(ballot.address).to.properAddress;
  });

  describe("Give right to vote", async () => {
    it("chairperson should give right to vote", async () => {
      // give right to vote for signer 1
      await ballot.giveRightToVote(signers[1].address);

      const voter = await ballot.voters(signers[1].address);

      expect(voter.weight).to.eq(1);
      expect(voter.voted).to.eq(false);
      expect(voter.delegate).to.eq(nullAddress);
      expect(voter.vote).to.eq(nullAddress);
    });

    it("only chairperson can give right to vote", async () => {
      const testFunc = async () => {
        // call Ballot contract at signer 2
        const ballotContract = await getBallotContract(signers[2]);

        // give right to vote for signer 1
        await ballotContract.giveRightToVote(signers[1].address);
      };
      expect(testFunc).to.throw;
    });

    it("cannot regive right to the same person", async () => {
      const testFunc = async () => {
        await ballot.giveRightToVote(signers[1].address);
        const voter1 = await ballot.voters(signers[1].address);
        expect(voter1.weight).to.greaterThan(0);

        await ballot.giveRightToVote(signers[1].address);
      };
      expect(testFunc).to.throw;
    });

    it("cannot give right to already-voted person", async () => {
      const testFunc = async () => {
        await ballot.giveRightToVote(signers[1].address);

        const ballotContract = await getBallotContract(signers[2]);
        await ballotContract.vote(0);
        const voter1 = await ballot.voters(signers[1].address);
        expect(voter1.voted).to.true;

        await ballot.giveRightToVote(signers[1].address);
      };
      expect(testFunc).to.throw;
    });
  });

  describe("voting", async () => {
    beforeEach(async () => {
      await Promise.all(
        Array.from({ length: 5 }, (v, k) => k + 1).map((i) =>
          ballot.giveRightToVote(signers[i].address)
        )
      );
    });

    describe("simple voting", async () => {
      it("should vote", async () => {
        // call ballot contract as signer 1
        const ballotContract = await getBallotContract(signers[1]);

        await ballotContract.vote(0);

        const voter = await ballot.voters(signers[1].address);
        const proposal = await ballot.proposals(0);
        expect(voter.voted).to.true;
        expect(voter.vote).to.eq(0);
        expect(proposal.voteCount).to.eq(1);
      });

      it("cannot revote", async () => {
        const testFunc = async () => {
          // call ballot contract as signer 1
          const ballotContract = await getBallotContract(signers[1]);

          await ballotContract.vote(0);
          const voter = await ballot.voters(signers[1].address);
          expect(voter.voted).to.true;

          await ballotContract.vote(1);
        };
        expect(testFunc).to.throw;
      });

      it("cannot vote if have no right", async () => {
        const testFunc = async () => {
          // call ballot contract as signer 6 - have no right
          const ballotContract = await getBallotContract(signers[6]);

          const voter = await ballot.voters(signers[6].address);
          expect(voter.weight).to.eq(0);

          await ballotContract.vote(0);
        };
        expect(testFunc).to.throw;
      });
    });

    describe("delegate", async () => {
      it("should delegate", async () => {
        // call ballot as siger 1
        const ballotContract = await getBallotContract(signers[1]);

        await ballotContract.delegate(signers[2].address);

        const voter1 = await ballot.voters(signers[1].address);
        const voter2 = await ballot.voters(signers[2].address);

        expect(voter1.voted).to.true;
        expect(voter2.weight).to.eq(2);
      });

      it("cannot self-delegate", async () => {
        const testFunc = async () => {
          const ballotContract = await getBallotContract(signers[1]);

          const voter = await ballot.voters(signers[1].address);
          expect(voter.weight).to.greaterThan(0);
          expect(voter.voted).to.false;

          await ballotContract.delegate(signers[1].address);
        };
        expect(testFunc).to.throw;
      });

      it("voted person cannot delegate", async () => {
        const testFunc = async () => {
          const ballotContract = await getBallotContract(signers[1]);

          await ballotContract.vote(0);
          const voter = await ballot.voters(signers[1].address);
          expect(voter.voted).to.true;

          await ballotContract.delegate(signers[2].address);
        };
        expect(testFunc).to.throw;
      });
    });

    describe("winner", async () => {
      it("should get winner", async () => {
        await Promise.all(
          [1, 2, 3].map(async (i) => {
            const ballotContract = await getBallotContract(signers[i]);
            ballotContract.vote(0);
          })
        );
        const winner = await ballot.winnerName();
        expect(winner).to.equal(proposal1Format);
      });
    });
  });
});
