//SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NeedMoreEthSent();
error RandomIpfsNft__Transferfailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    //when we mint an NFT, we will trigger a Chainlink VRF call to get us a randdom number
    // usin that number, we will get a random NFT
    // Pug, Shiba Inu, St. Bernard
    // Pug super rare
    // Shiba sort of rare
    // St.Bernard common
    // users hate to pay to mint an NFT
    // the owner of the contact can withdraw the ETH
    //Type Declaration
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }
    //Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vfrCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATION = 3;
    uint32 private constant NUM_WORDS = 1;

    //VFR Helpers
    mapping(uint256 => address) private s_requestIdToSender;

    //NFT Variables
    uint256 private s_tokenCounter;
    uint256 private constant MAX_CHANCE_VALUE = 100;
    string[] private s_dogTokenUris;
    uint256 private immutable i_mintFee;

    //events
    event NftRequest(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(

        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris,
        uint256 mintFee
   
        
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        i_vfrCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenUris = dogTokenUris;
        i_mintFee = mintFee;
    }

    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {

            revert RandomIpfsNft__NeedMoreEthSent();
        }
        requestId = i_vfrCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUM_WORDS
        );

        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequest(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address dogOwer = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;

        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;

        // Pug = 0 - 9  (10%)
        // Shiba-inu = 10 - 39  (30%)
        // St. Bernard = 40 = 99 (60%)
        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        s_tokenCounter = s_tokenCounter + 1;
        _safeMint(dogOwer, newTokenId);
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwer);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__Transferfailed();
        }
    }

    function getBreedFromModdedRng(uint256 moddedRng) private pure returns (Breed) {
        uint256 cumulitiveSum = 0;
        uint256[3] memory chances = getChanceArray();
        for (uint256 i = 0; i < chances.length; i++) {
            if (moddedRng >= cumulitiveSum && moddedRng < cumulitiveSum + chances[i]) {
                return Breed(i);
            }
            cumulitiveSum = chances[i];
        }
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function getChanceArray() private pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
