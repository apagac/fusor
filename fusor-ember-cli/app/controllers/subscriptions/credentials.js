import Ember from 'ember';
import request from 'ic-ajax';
import NeedsDeploymentMixin from "../../mixins/needs-deployment-mixin";

const MirrorStatus = {
  VALID: 1,
  INVALID: 2,
  VALIDATING: 3
};

export default Ember.Controller.extend(NeedsDeploymentMixin, {

  deploymentId: Ember.computed.alias("deploymentController.model.id"),
  cdnUrl: Ember.computed.alias("deploymentController.model.cdn_url"),
  manifestFile: Ember.computed.alias("deploymentController.model.manifest_file"),

  isRhev: Ember.computed.alias("deploymentController.model.deploy_rhev"),
  isOpenStack: Ember.computed.alias("deploymentController.model.deploy_openstack"),
  isCloudForms: Ember.computed.alias("deploymentController.model.deploy_cfme"),
  isOpenShift: Ember.computed.alias("deploymentController.model.deploy_openshift"),

  validCredentials: Ember.computed('model.identification', 'password', function() {
    // password is not saved in the model
    return (Ember.isPresent(this.get('model.identification')) && Ember.isPresent(this.get('password')));
  }),

  enableCredentialsNext: Ember.computed('validCredentials', 'model.isAuthenticated', function() {
    return this.get('validCredentials') || this.get('model.isAuthenticated');
  }),
  disableCredentialsNext: Ember.computed.not('enableCredentialsNext'),

  backRouteNameonCredentials: Ember.computed('isRhev', 'isOpenStack', 'isOpenShift', 'isCloudForms', function() {
    if (this.get('isCloudForms')) {
      return 'cloudforms.cfme-configuration';
    } else if (this.get('isOpenShift')) {
      return 'openshift.openshift-configuration';
    } else if (this.get('isOpenStack')) {
      return 'openstack.overcloud';
    } else if (this.get('isRhev')) {
      return 'storage';
    } else {
      return 'configure-environment';
    }
  }),

  nextButtonTitle: 'Next',

  actionCredentialsNext: Ember.computed('model.isAuthenticated', function() {
    if (this.get('model.isAuthenticated')) {
      return 'redirectToManagementApplication';
    } else {
      return 'loginPortal';
    }
  }),

  isDisconnected: Ember.computed.alias('deploymentController.model.is_disconnected'),
  hasManifestFile: Ember.computed.notEmpty('manifestFile'),
  noManifestFile: Ember.computed.empty('manifestFile'),

  disableNextDisconnected: Ember.computed(
    'noManifestFile',
    'currentMirrorStatus',
    function() {
      // If currentMirrorStatus is not VALID, disable next
      let retVal = this.get('noManifestFile') ||
      this.get('currentMirrorStatus') !== this.get('MirrorStatus').VALID;
      return retVal;
    }
  ),

  contentProviderType: Ember.computed('isDisconnected', function() {
    return (this.get('isDisconnected') ? "disconnected" : "redhat_cdn");
  }),

  contentProviderTitle: Ember.computed('isDisconnected', function() {
    return (this.get('isDisconnected') ? "Disconnected" : "Red Hat CDN");
  }),

  isDisconnectedSelected: Ember.computed('contentProviderType', function() {
    return (this.get('contentProviderType') === 'disconnected');
  }),

  MirrorStatus: MirrorStatus,
  currentMirrorStatus: MirrorStatus.INVALID,

  actions: {
    providerTypeChanged() {
      this.set('isDisconnected', this.get('isDisconnectedSelected'));
    },

    uploadManifest() {
      var self = this;
      var manifestFile = document.getElementById('manifest-file-field').files[0];
      var formData = new FormData();
      var token = Ember.$('meta[name="csrf-token"]').attr('content');
      formData.append('manifest_file[name]', manifestFile.name);
      formData.append('manifest_file[file]', manifestFile);
      formData.append('manifest_file[deployment_id]', this.get('deploymentId'));

      console.log('action: uploadManifest, PUT /fusor/api/v21/subscriptions/upload');
      //ic-ajax request
      request({
        type: 'PUT',
        url: '/fusor/api/v21/subscriptions/upload',
        data: formData,
        processData: false,
        headers: {'X-CSRF-Token': token},
        contentType: false
      }).then( function(result) {
        self.get('deploymentController.model').set('manifest_file', result.manifest_file);
        self.get('deploymentController.model').save().then(function () {
          return console.log('Manifest successfully uploaded');
        });
      }, function(error) {
        console.log(error);
        return console.log('ERROR on uploadManifest');
      });
    },

    uploadDifferentManifest() {
      this.set("manifestFile", null);
    },

    mirrorStatusUpdate(newStatus) {
      this.set('currentMirrorStatus', newStatus);
    }
  }

});
