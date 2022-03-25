// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "hardhat/console.sol";

contract Counter {
  uint256 count = 0;

  event CountTo(uint256 number);

  function getCount() public view returns (uint256) {
    return count;
  }

  function countUp() public returns (uint256) {
    //
    console.log("countUp: count = ", count);
    //
    uint256 newCount = count + 1;
    require(newCount > count, "Uint256 overflow");
    count = newCount;
    emit CountTo(count);
    return count;
  }

  function countDown() public returns (uint256) {
    //
    console.log("countUp: count = ", count);
    //
    uint newCount = count - 1;
    require(newCount < count, "Uint256 overflow");
    count = newCount;
    emit CountTo(count);
    return count;
  }
}