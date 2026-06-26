// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract PoseidonTestToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name; symbol = _symbol; decimals = _decimals; owner = msg.sender;
        _mint(msg.sender, _initialSupply);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) { _transfer(msg.sender, to, value); return true; }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyOwner { _mint(to, value); }
    function burn(uint256 value) external { _burn(msg.sender, value); }

    function faucet(address to) external returns (bool) {
        _mint(to, 1000 * 10 ** decimals);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(from != address(0) && to != address(0), "Zero address");
        require(balanceOf[from] >= value, "Insufficient balance");
        balanceOf[from] -= value; balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value; balanceOf[to] += value;
        emit Transfer(address(0), to, value); emit Mint(to, value);
    }

    function _burn(address from, uint256 value) internal {
        require(balanceOf[from] >= value, "Insufficient balance");
        balanceOf[from] -= value; totalSupply -= value;
        emit Transfer(from, address(0), value);
    }
}
