from odoo import fields, models


class BakkiUserProfile(models.Model):
    _name = 'bakki.user_profile'
    _description = 'Bakki user profile'
    _order = 'user_id'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade', index=True)
    generated_username = fields.Char(string='Generated Username', index=True)
    role = fields.Selection(
        selection=[
            ('owner', 'Owner'),
            ('planter', 'Planter'),
        ],
        string='Bakki Role',
        required=True,
        default='planter',
        index=True,
    )
    mobile_access_enabled = fields.Boolean(string='Mobile Access Enabled', default=False)
    active_planting_phase_id = fields.Many2one(
        'bakki.planting_phase',
        string='Active Planting Phase',
        ondelete='set null',
        index=True,
    )
    credential_ciphertext = fields.Text(
        string='Recoverable Credential Ciphertext',
        help='AES-GCM encrypted password payload used for the owner-visible credential exception.',
    )
    credential_nonce = fields.Char(string='Recoverable Credential Nonce')
    credential_tag = fields.Char(string='Recoverable Credential Auth Tag')
    credential_updated_at = fields.Datetime(string='Credential Updated At')
    notes = fields.Text(string='Notes')

    _sql_constraints = [
        ('bakki_user_profile_user_unique', 'unique(user_id)', 'Each Odoo user can have only one Bakki profile.'),
        ('bakki_user_profile_generated_username_unique', 'unique(generated_username)', 'Generated usernames must be unique.'),
    ]
