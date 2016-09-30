module.exports = {
  torqueToPower: function(torque, rpm) {
    var bhpToWatts = 745.699872;
    return rpm * torque / (bhpToWatts / Math.PI / 2 * 60);
  }
};