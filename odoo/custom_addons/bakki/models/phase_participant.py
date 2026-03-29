from odoo import fields, models


class BakkiPhaseParticipant(models.Model):
    _name = 'bakki.phase_participant'
    _description = 'Bakki phase participant'
    _order = 'phase_id, user_profile_id'

    phase_id = fields.Many2one('bakki.planting_phase', string='Planting Phase', required=True, ondelete='cascade', index=True)
    user_profile_id = fields.Many2one('bakki.user_profile', string='User Profile', required=True, ondelete='cascade', index=True)
    role = fields.Selection(
        selection=[
            ('owner', 'Owner'),
            ('planter', 'Planter'),
        ],
        string='Role',
        required=True,
        default='planter',
        index=True,
    )
    state = fields.Selection(
        selection=[
            ('invited', 'Invited'),
            ('active', 'Active'),
            ('removed', 'Removed'),
        ],
        string='Participation State',
        default='active',
        required=True,
        index=True,
    )
    note = fields.Text(string='Note')

    _sql_constraints = [
        (
            'bakki_phase_participant_unique',
            'unique(phase_id, user_profile_id)',
            'A user profile can only appear once in a planting phase.',
        ),
    ]
