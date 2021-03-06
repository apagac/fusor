#
# Copyright 2014 Red Hat, Inc.
#
# This software is licensed to you under the GNU General Public
# License as published by the Free Software Foundation; either version
# 2 of the License (GPLv2) or (at your option) any later version.
# There is NO WARRANTY for this software, express or implied,
# including the implied warranties of MERCHANTABILITY,
# NON-INFRINGEMENT, or FITNESS FOR A PARTICULAR PURPOSE. You should
# have received a copy of GPLv2 along with this software; if not, see
# http://www.gnu.org/licenses/old-licenses/gpl-2.0.txt.

module Actions
  module Fusor
    module Host
      class WaitUntilProvisioned < Actions::Fusor::FusorBaseAction

        TIMEOUT = 7200

        middleware.use Actions::Fusor::Middleware::AsCurrentUser
        # Using the Timeout middleware to make sure input[:timeout] is
        # set. The actual timeout check is performed separately for
        # the WaitUntilProvisioned because it's not a polling action.
        middleware.use Actions::Fusor::Middleware::Timeout

        def plan(hostid, wait_for_puppet = false)
          super()
          sequence do
            plan_self(host_id: hostid)
            if wait_for_puppet
              plan_action(::Actions::Fusor::Host::WaitForPuppet, hostid)
            end
          end
        end

        def run(event = nil)
          host = ::Host::Base.find(input[:host_id])
          fail _("====== Host is null! Cannot wait for host! ====== ") unless host

          ::Fusor.log.info "Waiting for host #{host.name}'s deployment to complete..."
          if host.is_a?(::Host::Managed) && host.global_status > 1
            fail _("Failed to provision host '%s'.") % host.name
          end

          case event
          when nil
            suspend do |suspended_action|
              # schedule timeout
              world.clock.ping suspended_action, input[:timeout], "timeout"

              # wake up when provisioning is finished
              Rails.cache.write(
                  ::Fusor::Concerns::HostOrchestrationBuildHook.cache_id(host.id),
                  { execution_plan_id: suspended_action.execution_plan_id,
                    step_id:           suspended_action.step_id })
            end
          when "timeout"
            # clear timeout_start so that the action can be resumed/skipped
            output[:timeout_start] = nil
            fail(::Foreman::Exception,
                 "You've reached the timeout set for this action. If the " +
                 "action is still ongoing, you can click on the " +
                 "\"Resume Deployment\" button to continue.")
          when Hash
            output[:installed_at] = event.fetch(:installed_at).to_s
          when Dynflow::Action::Skip
            output[:installed_at] = Time.now.utc.to_s
          else
            raise TypeError
          end
        end

        def run_progress_weight
          4
        end

        def run_progress
          0.1
        end

      end
    end
  end
end
