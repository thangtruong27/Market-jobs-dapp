App = {
  web3Provider: null,
  contracts: {},
  init: async function () {
    return await App.initWeb3();
  },

  initWeb3: async function () {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('PartTime.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      App.contracts.PartTime = TruffleContract(data);
      // Set the provider for our contract
      App.contracts.PartTime.setProvider(App.web3Provider);
      // Use our contract to retrieve value data
      App.getJobs();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '#btn-create', App.handleCreate);
    $(document).on('click', '#btn-apply', App.handleApply);
    $(document).on('click', '#btn-done', App.handleDone);
  },

  getJobs: function () {
    var partTimeInstance;
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }

      const account = accounts[0];

      App.contracts.PartTime.deployed().then(function (instance) {
        partTimeInstance = instance;
        partTimeInstance.totalJob.call().then(function (totalJob) {
          const numJobs = totalJob.toNumber();
          var jobsRow = $('#jobsRow');
          jobsRow.empty();
          var jobTemplate = $('#jobTemplate');

          for (let i = 0; i < numJobs; i++) {

            partTimeInstance.viewJob.call(i).then(function (data) {
              console.log(data);
              jobTemplate.find('.panel-title').text(data[4]);
              jobTemplate.find('.job-id').text(data[0]);
              jobTemplate.find('.job-creator').text(data[1]);
              jobTemplate.find('.job-labor').text('null');
              jobTemplate.find('.job-salary').text(`${data[2] / 1000000000000000000} ETH`);
              jobTemplate.find('.job-description').text(data[5]);
              jobTemplate.find('#btn-apply').attr('data-id', data[0]);
              jobTemplate.find('#btn-apply').attr('data-salary', data[2]);
              jobTemplate.find('#btn-done').attr('data-id', data[0]);
              jobTemplate.find('#btn-apply').attr('disabled', false);
              jobTemplate.find('#btn-apply').css('display', 'inline');
              jobTemplate.find('#btn-done').css('display', 'none');
              jobTemplate.find('.job-done').text('');
              if (data[6] !== '0x0000000000000000000000000000000000000000') {

                jobTemplate.find('#btn-apply').attr('disabled', true);
                jobTemplate.find('.job-labor').text(data[6]);
                if (account === data[1]) {
                  jobTemplate.find('#btn-done').css('display', 'inline');
                }
              }
              if (account === data[1]) {
                jobTemplate.find('#btn-apply').css('display', 'none');
              }
              if (data[7] === true) {
                jobTemplate.find('.job-done').text('Done').css('color', 'green');
                jobTemplate.find('#btn-done').css('display', 'none');
              }

              jobsRow.append(jobTemplate.html());
            });
          }
        }).catch(function (err) {
          console.log(err.message);
        });
      });
    });
  },
  createTx: function (from, to, value = 0, gas = 1000000, gasPrice = 20000000) {
    return {
      from: from,
      to: to,
      gas: gas,
      gasPrice: gasPrice,
      value: value
    };
  },
  handleCreate: function (event) {
    event.preventDefault();
    var instancePartTime;
    const timeStamp = web3.toBigNumber((((new Date()).getTime() / 1000) | 0) + 432000);

    //Create a partime job
    const title = $('#title').val();
    const description = $('#description').val();
    const salary = $('#salary').val();
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      const account = accounts[0];
      App.contracts.PartTime.deployed().then(function (instance) {
        instancePartTime = instance;
        return instancePartTime.createJob(
          timeStamp,
          title,
          description,
          App.createTx(account, instancePartTime.address, web3.toWei(salary, 'ether'))
        );
      }).then(function (result) {
        console.log(result);
        $('#exampleModal').modal('hide');
        const event = instancePartTime.NewJob();
        App.handleEvent(event);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },
  handleApply: function (event) {
    event.preventDefault();
    var instancePartTime;
    var jobId = parseInt($(event.target).data('id'));
    var deposit = parseInt($(event.target).data('salary')) / 10000000000000000000;
    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      const account = accounts[0];

      App.contracts.PartTime.deployed().then(function (instance) {
        instancePartTime = instance;
        return instancePartTime.takeJob(
          jobId,
          App.createTx(account, instancePartTime.address, web3.toWei(deposit, 'ether'))
        );
      }).then(function (result) {
        console.log("apply successfully!");
        const event = instancePartTime.TakeJob();
        App.handleEvent(event);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },
  handleDone: function (event) {
    event.preventDefault();
    var instancePartTime;

    var jobId = parseInt($(event.target).data('id'));

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
      }
      const account = accounts[0];

      App.contracts.PartTime.deployed().then(function (instance) {
        instancePartTime = instance;
        return instancePartTime.pay(
          jobId,
          App.createTx(account, instancePartTime.address)
        );
      }).then(function (result) {
        console.log("pay successfully!");
        const event = instancePartTime.Paid();
        App.handleEvent(event);
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },
  handleEvent: function (event) {
    console.log('Waiting for a event...');
    event.watch(function (error, result) {
      if (!error) {
        App.getJobs();
      } else {
        console.log(error);
      }
      event.stopWatching();
    });
  }
}


$(function () {
  $(window).load(function () {
    App.init();
  });
});

