import Ember from 'ember';

export default Ember.Component.extend({

  classNames: ['row cancel-back-next-row'],

  actions: {
    openCancelDeploymentModal() {
      this.set('openModal', true);
    },

    saveAndCancelDeployment() {
      this.get('targetObject').send('saveAndCancelDeployment');
      this.set('openModal', false);
    },

    cancelAndDeleteDeployment() {
      this.get('targetObject').send('cancelAndDeleteDeployment');
      this.set('openModal', false);
    },

    cancelAndRollbackNewDeployment() {
      this.get('targetObject').send('cancelAndRollbackNewDeployment');
    }
  }

});
