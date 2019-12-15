pragma solidity ^0.4.23;


contract PartTime {
    
    //Job structure
    struct Job {
        uint256 id;
        address creator;        
        uint256 salary;        
        uint256 timeOut;
        string title;
        string description;
        address labor;
        bool done;
    }

    //New job append
    event NewJob(uint256 indexed id,
    address creator,
    uint256 salary,
    uint256 timeOut);

    //An woker start working
    event TakeJob(
    uint256 indexed id,
    address indexed labor);
    //Paid
    event Paid(address indexed creator, address indexed labor, uint256 value);

    //Minium accept salary
    uint256 constant public MINIUM_SALARY = 0.1 ether;

    //The number of jobs
    uint256 public totalJob;

    //Mapped data
    mapping (uint256 => Job) public jobData;
    
    //Transaction must contant Ethereum
    modifier onlyHaveFund {
        require(msg.value > MINIUM_SALARY);
        _;
    }

    //Valid timeOut should be greater than 3 days
    modifier onlyValidTimeOut(uint256 timeOut) {
        require(timeOut > 3 days);
        _;
    }

    //Check valid job Id
    modifier onlyValidId(uint256 jobId) {
        require(jobId < totalJob);
        _;
    }
    //Only job creator is accepted
    modifier onlyCreator(uint256 jobId) {
        require(jobData[jobId].creator == msg.sender);
        _;
    }
    //Only not completed
    modifier onlyNotCompleted(uint256 jobId){
        require(jobData[jobId].done == false);
        _;
    }
    //Append new job to mapping
    function createJob (uint256 timeOut, string title, string description)
    public onlyHaveFund onlyValidTimeOut(timeOut) payable returns(uint256 jobId)
    {
        // Saving a little gas by create a temporary object
        Job memory newJob;

        // Assign jobId
        jobId = totalJob;
        
        newJob.id = jobId;
        newJob.timeOut = timeOut;
        newJob.title = title;
        newJob.description = description; 
        newJob.salary = msg.value;
        newJob.creator = msg.sender;
        newJob.done = false;
        //Trigger event
        emit NewJob(jobId, msg.sender, msg.value, timeOut);

        // Append newJob to jobData
        jobData[totalJob++] = newJob;

        return jobId;
    }

    //Take job
    function takeJob (uint256 jobId)
    public onlyValidId(jobId) payable returns(bool)
    {
        //Trigger event to log labor
        emit TakeJob(jobId, msg.sender);

        //Change working state        
        jobData[jobId].labor = msg.sender;
        return true;
    }

    //View job data
    function viewJob(uint256 jobId)
    public onlyValidId(jobId) view returns (
    uint256 id,
    address creator,
    uint256 salary,
    uint256 timeOut,
    string title,
    string description,
    address labor,
    bool done)
    {
        Job memory jobReader = jobData[jobId];
        return (
        jobReader.id,
        jobReader.creator,
        jobReader.salary,        
        jobReader.timeOut,        
        jobReader.title,
        jobReader.description,
        jobReader.labor,
        jobReader.done);
    }
    
    //Creator pay money
    function pay(uint256 jobId)
    public onlyValidId(jobId) onlyCreator(jobId) onlyNotCompleted(jobId) returns(bool) {
        uint256 value;
        
        //Fund = salary + mortgage
        value = jobData[jobId].salary;
        value = value + (value/10);

        //Mark job as completed
        jobData[jobId].done = true;

        //Transfer fund and mortgage to labor
        jobData[jobId].labor.transfer(value);
        
        emit Paid(jobData[jobId].creator, jobData[jobId].labor, value);

        return true;
    }
}